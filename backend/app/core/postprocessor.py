import os

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

from app.core.settings import get_settings


OCR_CONFIGS = (
    "--oem 1 --psm 4",
    "--oem 3 --psm 4",
)


def _to_grayscale(image: np.ndarray) -> np.ndarray:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")

    if image.ndim == 2:
        return image.copy()

    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def _resize_longest_side(gray: np.ndarray, min_longest_side: int) -> np.ndarray:
    height, width = gray.shape[:2]
    longest_side = max(height, width)
    if longest_side >= min_longest_side:
        return gray

    upscale = min_longest_side / float(longest_side)
    return cv2.resize(
        gray,
        (
            max(1, int(round(width * upscale))),
            max(1, int(round(height * upscale))),
        ),
        interpolation=cv2.INTER_CUBIC,
    )


def _prepare_document_gray(image: np.ndarray, min_longest_side: int) -> np.ndarray:
    gray = _to_grayscale(image)
    return _resize_longest_side(gray, min_longest_side)


def _normalize_document_gray(image: np.ndarray, min_longest_side: int) -> np.ndarray:
    gray = _prepare_document_gray(image, min_longest_side)
    background = cv2.GaussianBlur(gray, (0, 0), 25)
    flattened = cv2.divide(gray, background, scale=255)
    return cv2.normalize(flattened, None, 0, 255, cv2.NORM_MINMAX)


def _mean_confidence(data: dict[str, list[str]]) -> float:
    confidences: list[float] = []
    for confidence in data.get("conf", []):
        try:
            numeric_confidence = float(confidence)
        except (TypeError, ValueError):
            continue
        if numeric_confidence >= 0:
            confidences.append(numeric_confidence)

    return round(sum(confidences) / len(confidences), 2) if confidences else 0.0


def _ocr_content_length(data: dict[str, list[str]]) -> int:
    return sum(len(str(token).strip()) for token in data.get("text", []) if str(token).strip())


def _candidate_rank(confidence: float, content_length: int) -> tuple[float, int]:
    effective_confidence = confidence
    if content_length == 0:
        effective_confidence -= 1000.0
    elif content_length < 20:
        effective_confidence -= 25.0
    elif content_length < 80:
        effective_confidence -= 5.0

    return effective_confidence, content_length


def _to_ocr_rgb(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def _configure_tesseract() -> None:
    settings = get_settings()
    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    if settings.tessdata_prefix:
        os.environ["TESSDATA_PREFIX"] = settings.tessdata_prefix


def _run_ocr_data(image: np.ndarray, languages: str, config: str) -> dict[str, list[str]]:
    try:
        return pytesseract.image_to_data(
            _to_ocr_rgb(image),
            lang=languages,
            config=config,
            output_type=Output.DICT,
        )
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract is not installed or not available in PATH.") from exc
    except pytesseract.TesseractError as exc:
        raise RuntimeError(f"OCR processing failed: {exc}") from exc


def _run_ocr_text(image: np.ndarray, languages: str, config: str) -> str:
    try:
        return pytesseract.image_to_string(
            _to_ocr_rgb(image),
            lang=languages,
            config=config,
        ).strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract is not installed or not available in PATH.") from exc
    except pytesseract.TesseractError as exc:
        raise RuntimeError(f"OCR processing failed: {exc}") from exc


def _build_ocr_variants(document_image: np.ndarray) -> list[tuple[str, np.ndarray]]:
    gray = _prepare_document_gray(document_image, min_longest_side=1400)
    unsharp = cv2.addWeighted(
        gray,
        1.7,
        cv2.GaussianBlur(gray, (0, 0), 1.4),
        -0.7,
        0,
    )
    flattened = _normalize_document_gray(document_image, min_longest_side=1400)

    return [
        ("gray", gray),
        ("unsharp", unsharp),
        ("flattened", flattened),
    ]


def _clean_binary_scan(binary_scan: np.ndarray) -> np.ndarray:
    if binary_scan is None or binary_scan.size == 0:
        raise ValueError("invalid_image")

    inverted = 255 - binary_scan
    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(inverted, 8)
    cleaned_inverted = np.zeros_like(inverted)
    height, width = binary_scan.shape[:2]
    edge_area_threshold = max(25, (height * width) // 60000)
    speckle_area_threshold = max(8, (height * width) // 250000)

    for label_index in range(1, component_count):
        x = stats[label_index, cv2.CC_STAT_LEFT]
        y = stats[label_index, cv2.CC_STAT_TOP]
        component_width = stats[label_index, cv2.CC_STAT_WIDTH]
        component_height = stats[label_index, cv2.CC_STAT_HEIGHT]
        area = stats[label_index, cv2.CC_STAT_AREA]

        touches_border = (
            x == 0
            or y == 0
            or x + component_width >= width
            or y + component_height >= height
        )
        if touches_border and area > edge_area_threshold:
            continue
        if area < speckle_area_threshold and component_width <= 3 and component_height <= 3:
            continue

        cleaned_inverted[labels == label_index] = 255

    return 255 - cleaned_inverted


def build_scan_image(warped: np.ndarray) -> np.ndarray:
    if warped is None or warped.size == 0:
        raise ValueError("invalid_image")

    normalized = _normalize_document_gray(warped, min_longest_side=1400)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    enhanced = clahe.apply(normalized)
    sharpened = cv2.addWeighted(
        enhanced,
        1.45,
        cv2.GaussianBlur(enhanced, (0, 0), 1.1),
        -0.45,
        0,
    )
    denoised = cv2.medianBlur(sharpened, 3)

    block_size = max(25, (min(denoised.shape[:2]) // 18) | 1)
    if block_size % 2 == 0:
        block_size += 1

    scan = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size,
        9,
    )
    return _clean_binary_scan(scan)


def extract_text(document_image: np.ndarray, languages: str) -> tuple[str, float]:
    if document_image is None or document_image.size == 0:
        raise ValueError("invalid_image")

    _configure_tesseract()

    best_image: np.ndarray | None = None
    best_config: str | None = None
    best_confidence = -1.0
    best_content_length = -1
    best_rank = (-10_000.0, -1)

    for _, candidate_image in _build_ocr_variants(document_image):
        for config in OCR_CONFIGS:
            data = _run_ocr_data(candidate_image, languages, config)
            confidence = _mean_confidence(data)
            content_length = _ocr_content_length(data)
            rank = _candidate_rank(confidence, content_length)

            if rank > best_rank:
                best_image = candidate_image
                best_config = config
                best_confidence = confidence
                best_content_length = content_length
                best_rank = rank

    if best_image is None or best_config is None:
        return "", 0.0

    text = _run_ocr_text(best_image, languages, best_config)
    return text, best_confidence
