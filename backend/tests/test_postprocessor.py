import numpy as np

from app.core import postprocessor
from app.core.settings import Settings


def test_extract_text_prefers_non_empty_candidate(monkeypatch) -> None:
    empty_high_confidence = np.zeros((10, 10), dtype=np.uint8)
    strong_candidate = np.full((10, 10), 255, dtype=np.uint8)

    monkeypatch.setattr(
        postprocessor,
        "_build_ocr_variants",
        lambda image, scan_image, scan_mode: [
            ("empty", empty_high_confidence),
            ("strong", strong_candidate),
        ],
    )
    monkeypatch.setattr(
        postprocessor,
        "get_settings",
        lambda: Settings(
            cors_origins=["http://localhost:3000"],
            ocr_langs="fra+eng",
            max_upload_mb=10,
            scan_mode="balanced",
            tesseract_cmd="tesseract",
            tessdata_prefix=None,
        ),
    )

    def fake_run_ocr_data(image, languages, config):
        if image.mean() == 0:
            return {
                "conf": ["95"],
                "text": [""],
                "left": ["0"],
                "top": ["0"],
                "width": ["1"],
                "height": ["1"],
            }
        if "--oem 1 --psm 4" in config:
            return {
                "conf": ["90", "84"],
                "text": ["best", "result"],
                "left": ["1", "6"],
                "top": ["2", "2"],
                "width": ["4", "4"],
                "height": ["3", "3"],
            }
        return {
            "conf": ["55"],
            "text": ["backup"],
            "left": ["1"],
            "top": ["1"],
            "width": ["5"],
            "height": ["3"],
        }

    def fake_run_ocr_text(image, languages, config):
        if image.mean() == 0:
            return ""
        if "--oem 1 --psm 4" in config:
            return "Best OCR result"
        return "Fallback OCR result"

    monkeypatch.setattr(postprocessor, "_run_ocr_data", fake_run_ocr_data)
    monkeypatch.setattr(postprocessor, "_run_ocr_text", fake_run_ocr_text)

    result = postprocessor.extract_text(
        np.full((16, 16), 127, dtype=np.uint8),
        np.full((16, 16), 255, dtype=np.uint8),
        "fra+eng",
        scan_mode="balanced",
    )

    assert result.text == "Best OCR result"
    assert result.mean_confidence == 87.0
    assert [token.text for token in result.tokens] == ["best", "result"]


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


def test_build_scan_image_supports_multiple_scan_modes() -> None:
    image = np.full((480, 340, 3), 225, dtype=np.uint8)
    cv2 = postprocessor.cv2
    cv2.rectangle(image, (30, 30), (310, 450), (245, 245, 245), -1)
    cv2.putText(
        image,
        "Mode Test",
        (60, 220),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (70, 70, 70),
        2,
        cv2.LINE_AA,
    )

    outputs = {
        mode: postprocessor.build_scan_image(image, scan_mode=mode)
        for mode in postprocessor.SUPPORTED_SCAN_MODES
    }

    assert all(output.size > 0 for output in outputs.values())
    assert {output.shape for output in outputs.values()} == {next(iter(outputs.values())).shape}
