import numpy as np

from app.core import postprocessor
from app.core.settings import Settings


def test_extract_text_prefers_non_empty_candidate(monkeypatch) -> None:
    empty_high_confidence = np.zeros((10, 10), dtype=np.uint8)
    strong_candidate = np.full((10, 10), 255, dtype=np.uint8)

    monkeypatch.setattr(
        postprocessor,
        "_build_ocr_variants",
        lambda image: [("empty", empty_high_confidence), ("strong", strong_candidate)],
    )
    monkeypatch.setattr(
        postprocessor,
        "get_settings",
        lambda: Settings(
            cors_origins=["http://localhost:3000"],
            ocr_langs="fra+eng",
            max_upload_mb=10,
            tesseract_cmd="tesseract",
            tessdata_prefix=None,
        ),
    )

    def fake_run_ocr_data(image, languages, config):
        if image.mean() == 0:
            return {"conf": ["95"], "text": [""]}
        if "--oem 1 --psm 4" in config:
            return {"conf": ["90", "84"], "text": ["best", "result"]}
        return {"conf": ["55"], "text": ["backup"]}

    def fake_run_ocr_text(image, languages, config):
        if image.mean() == 0:
            return ""
        if "--oem 1 --psm 4" in config:
            return "Best OCR result"
        return "Fallback OCR result"

    monkeypatch.setattr(postprocessor, "_run_ocr_data", fake_run_ocr_data)
    monkeypatch.setattr(postprocessor, "_run_ocr_text", fake_run_ocr_text)

    text, confidence = postprocessor.extract_text(np.full((16, 16), 127, dtype=np.uint8), "fra+eng")

    assert text == "Best OCR result"
    assert confidence == 87.0


def test_build_scan_image_cleans_border_artifacts() -> None:
    image = np.full((600, 420, 3), 180, dtype=np.uint8)
    cv2 = postprocessor.cv2
    cv2.rectangle(image, (24, 24), (395, 575), (235, 235, 235), -1)
    cv2.putText(
        image,
        "Scan quality",
        (70, 160),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (60, 60, 60),
        2,
        cv2.LINE_AA,
    )
    image[:, :8] = 0
    image[:, -8:] = 0
    image[40, 260] = (0, 0, 0)
    image[520, 300] = (0, 0, 0)

    scan = postprocessor.build_scan_image(image)

    assert scan[:, :8].mean() > 245
    assert scan[:, -8:].mean() > 245
    assert (255 - scan).sum() > 0
