import cv2
import numpy as np
import os
import pytesseract
from pytesseract import Output

from app.core.settings import get_settings

def build_scan_image(warped: np.ndarray) -> np.ndarray:
    if warped is None or warped.size == 0:
        raise ValueError("invalid_image")

    if warped.ndim == 2:
        gray = warped.copy()
    else:
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

    height, width = gray.shape[:2]
    longest_side = max(height, width)
    if longest_side < 1400:
        upscale = 1400 / float(longest_side)
        gray = cv2.resize(
            gray,
            (max(1, int(round(width * upscale))), max(1, int(round(height * upscale)))),
            interpolation=cv2.INTER_CUBIC,
        )

    normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    blurred = cv2.GaussianBlur(normalized, (5, 5), 0)

    block_size = max(21, (min(blurred.shape[:2]) // 12) | 1)
    if block_size % 2 == 0:
        block_size += 1

    scan = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size,
        15,
    )
    return scan

def extract_text(scan_image: np.ndarray, languages: str) -> tuple[str, float]:
    if scan_image is None or scan_image.size == 0:
        raise ValueError("invalid_image")

    settings = get_settings()
    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    if settings.tessdata_prefix:
        os.environ["TESSDATA_PREFIX"] = settings.tessdata_prefix

    if scan_image.ndim == 2:
        ocr_image = cv2.cvtColor(scan_image, cv2.COLOR_GRAY2RGB)
    else:
        ocr_image = cv2.cvtColor(scan_image, cv2.COLOR_BGR2RGB)

    config = "--oem 3 --psm 6"
    try:
        text = pytesseract.image_to_string(ocr_image, lang=languages, config=config).strip()
        data = pytesseract.image_to_data(
            ocr_image,
            lang=languages,
            config=config,
            output_type=Output.DICT,
        )
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract is not installed or not available in PATH.") from exc
    except pytesseract.TesseractError as exc:
        raise RuntimeError(f"OCR processing failed: {exc}") from exc

    confidences: list[float] = []
    for confidence in data.get("conf", []):
        try:
            numeric_confidence = float(confidence)
        except (TypeError, ValueError):
            continue
        if numeric_confidence >= 0:
            confidences.append(numeric_confidence)

    mean_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0
    return text, mean_confidence
