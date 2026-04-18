import os
from dataclasses import dataclass

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

from app.core.settings import get_settings


OCR_CONFIGS = (
    "--oem 1 --psm 4",
    "--oem 3 --psm 4",
)
SUPPORTED_SCAN_MODES = ("clean", "balanced", "ocr-optimized")


@dataclass
class OcrToken:
    text: str
    confidence: float
    x: float
    y: float
    width: float
    height: float


@dataclass
class OcrExtraction:
    text: str
    mean_confidence: float
    tokens: list[OcrToken]


def validate_scan_mode(scan_mode: str) -> str:
    normalized_scan_mode = scan_mode.strip().lower()
    if normalized_scan_mode not in SUPPORTED_SCAN_MODES:
        raise ValueError("invalid_scan_mode")
    return normalized_scan_mode


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


def _thicken_text(binary_scan: np.ndarray, kernel_size: int) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    return 255 - cv2.dilate(255 - binary_scan, kernel, iterations=1)


def _scan_mode_parameters(scan_mode: str) -> dict[str, float | tuple[int, int]]:
    normalized_scan_mode = validate_scan_mode(scan_mode)

    if normalized_scan_mode == "clean":
        return {
            "clip_limit": 1.9,
            "tile_grid": (8, 8),
            "sharp_amount": 1.35,
            "sharp_blur": 1.0,
            "median_kernel": 3,
            "block_divisor": 15,
            "threshold_c": 11,
            "text_expansion": 0,
        }

    if normalized_scan_mode == "ocr-optimized":
        return {
            "clip_limit": 2.6,
            "tile_grid": (8, 8),
            "sharp_amount": 1.65,
            "sharp_blur": 1.15,
            "median_kernel": 3,
            "block_divisor": 21,
            "threshold_c": 7,
            "text_expansion": 2,
        }

    return {
        "clip_limit": 2.2,
        "tile_grid": (8, 8),
        "sharp_amount": 1.45,
        "sharp_blur": 1.1,
        "median_kernel": 3,
        "block_divisor": 18,
        "threshold_c": 9,
        "text_expansion": 0,
    }


def _build_ocr_variants(
    document_image: np.ndarray,
    scan_image: np.ndarray,
    scan_mode: str,
) -> list[tuple[str, np.ndarray]]:
    validate_scan_mode(scan_mode)

    gray = _prepare_document_gray(document_image, min_longest_side=1400)
    unsharp = cv2.addWeighted(
        gray,
        1.7,
        cv2.GaussianBlur(gray, (0, 0), 1.4),
        -0.7,
        0,
    )
    flattened = _normalize_document_gray(document_image, min_longest_side=1400)
    scan_gray = _prepare_document_gray(scan_image, min_longest_side=1400)
    scan_clean = cv2.medianBlur(scan_gray, 3)
    ocr_boost = cv2.adaptiveThreshold(
        flattened,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        25,
        8,
    )
    ocr_boost = _thicken_text(ocr_boost, 2)

    if scan_mode == "clean":
        return [
            ("scan", scan_clean),
            ("flattened", flattened),
            ("gray", gray),
            ("unsharp", unsharp),
            ("ocr-boost", ocr_boost),
        ]

    if scan_mode == "ocr-optimized":
        return [
            ("ocr-boost", ocr_boost),
            ("scan", scan_clean),
            ("flattened", flattened),
            ("unsharp", unsharp),
            ("gray", gray),
        ]

    return [
        ("scan", scan_clean),
        ("gray", gray),
        ("flattened", flattened),
        ("unsharp", unsharp),
        ("ocr-boost", ocr_boost),
    ]


def _build_ocr_tokens(data: dict[str, list[str]], image_shape: tuple[int, int]) -> list[OcrToken]:
    height, width = image_shape[:2]
    tokens: list[OcrToken] = []

    for index, raw_text in enumerate(data.get("text", [])):
        text = str(raw_text).strip()
        if not text:
            continue

        try:
            confidence = float(data["conf"][index])
            left = max(0, int(data["left"][index]))
            top = max(0, int(data["top"][index]))
            token_width = max(1, int(data["width"][index]))
            token_height = max(1, int(data["height"][index]))
        except (KeyError, TypeError, ValueError, IndexError):
            continue

        if confidence < 0:
            continue

        tokens.append(
            OcrToken(
                text=text,
                confidence=round(confidence, 2),
                x=round(left / float(width), 6),
                y=round(top / float(height), 6),
                width=round(token_width / float(width), 6),
                height=round(token_height / float(height), 6),
            )
        )

    return tokens


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


def build_scan_image(warped: np.ndarray, scan_mode: str = "balanced") -> np.ndarray:
    if warped is None or warped.size == 0:
        raise ValueError("invalid_image")

    parameters = _scan_mode_parameters(scan_mode)
    normalized = _normalize_document_gray(warped, min_longest_side=1400)
    clahe = cv2.createCLAHE(
        clipLimit=float(parameters["clip_limit"]),
        tileGridSize=tuple(parameters["tile_grid"]),
    )
    enhanced = clahe.apply(normalized)
    sharpened = cv2.addWeighted(
        enhanced,
        float(parameters["sharp_amount"]),
        cv2.GaussianBlur(enhanced, (0, 0), float(parameters["sharp_blur"])),
        1.0 - float(parameters["sharp_amount"]),
        0,
    )
    denoised = cv2.medianBlur(sharpened, int(parameters["median_kernel"]))

    block_size = max(21, (min(denoised.shape[:2]) // int(parameters["block_divisor"])) | 1)
    if block_size % 2 == 0:
        block_size += 1

    scan = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size,
        int(parameters["threshold_c"]),
    )

    if int(parameters["text_expansion"]) > 0:
        scan = _thicken_text(scan, int(parameters["text_expansion"]))

    return _clean_binary_scan(scan)


def extract_text(
    document_image: np.ndarray,
    scan_image: np.ndarray,
    languages: str,
    scan_mode: str = "balanced",
) -> OcrExtraction:
    if document_image is None or document_image.size == 0:
        raise ValueError("invalid_image")
    if scan_image is None or scan_image.size == 0:
        raise ValueError("invalid_image")

    normalized_scan_mode = validate_scan_mode(scan_mode)
    _configure_tesseract()

    best_image: np.ndarray | None = None
    best_data: dict[str, list[str]] | None = None
    best_config: str | None = None
    best_confidence = -1.0
    best_rank = (-10_000.0, -1)

    for _, candidate_image in _build_ocr_variants(document_image, scan_image, normalized_scan_mode):
        for config in OCR_CONFIGS:
            data = _run_ocr_data(candidate_image, languages, config)
            confidence = _mean_confidence(data)
            content_length = _ocr_content_length(data)
            rank = _candidate_rank(confidence, content_length)

            if rank > best_rank:
                best_image = candidate_image
                best_data = data
                best_config = config
                best_confidence = confidence
                best_rank = rank

    if best_image is None or best_data is None or best_config is None:
        return OcrExtraction(text="", mean_confidence=0.0, tokens=[])

    text = _run_ocr_text(best_image, languages, best_config)
    tokens = _build_ocr_tokens(best_data, best_image.shape[:2])
    return OcrExtraction(text=text, mean_confidence=best_confidence, tokens=tokens)
