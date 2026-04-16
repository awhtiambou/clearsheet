from pathlib import Path

import cv2
import numpy as np
import pytest

from app.core.postprocessor import extract_text
from app.core.settings import get_settings
from tests.conftest import has_tesseract


pytestmark = pytest.mark.skipif(not has_tesseract(), reason="Tesseract OCR is not configured.")


def test_extract_text_with_tesseract_returns_non_empty_text() -> None:
    settings = get_settings()
    assert settings.tessdata_prefix is not None
    assert Path(settings.tessdata_prefix).exists()

    image = np.full((220, 1000), 255, dtype=np.uint8)
    cv2.putText(image, "Bonjour test OCR 123", (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0,), 4, cv2.LINE_AA)

    text, confidence = extract_text(image, "fra+eng")

    assert text.strip()
    assert confidence >= 0.0
