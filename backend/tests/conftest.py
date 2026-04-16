from pathlib import Path
import shutil

import cv2
import numpy as np
import pytest

from app.core.settings import get_settings


def build_document_image() -> np.ndarray:
    image = np.full((900, 700, 3), 35, dtype=np.uint8)
    cv2.rectangle(image, (110, 90), (600, 790), (245, 245, 245), -1)
    cv2.putText(
        image,
        "Bonjour OCR 123",
        (150, 340),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.35,
        (20, 20, 20),
        3,
        cv2.LINE_AA,
    )
    cv2.putText(
        image,
        "Scan pipeline test",
        (145, 430),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (20, 20, 20),
        2,
        cv2.LINE_AA,
    )
    cv2.line(image, (145, 500), (560, 500), (30, 30, 30), 2)
    cv2.line(image, (145, 560), (560, 560), (30, 30, 30), 2)
    return image


def encode_png_bytes(image: np.ndarray) -> bytes:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise RuntimeError("Failed to encode synthetic test image.")
    return buffer.tobytes()


@pytest.fixture
def document_png_bytes() -> bytes:
    return encode_png_bytes(build_document_image())


def has_tesseract() -> bool:
    settings = get_settings()
    command_path = Path(settings.tesseract_cmd)
    has_binary = command_path.exists() or shutil.which(settings.tesseract_cmd) is not None
    if not has_binary:
        return False

    tessdata_prefix = settings.tessdata_prefix
    if not tessdata_prefix:
        return False

    fra_path = Path(tessdata_prefix) / "fra.traineddata"
    eng_path = Path(tessdata_prefix) / "eng.traineddata"
    return fra_path.exists() and eng_path.exists()
