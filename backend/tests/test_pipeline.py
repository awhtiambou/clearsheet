import base64

from app.core.pipeline import process_document


def test_process_document_returns_debug_images(monkeypatch, document_png_bytes: bytes) -> None:
    from app.core import pipeline

    monkeypatch.setattr(pipeline, "extract_text", lambda image, languages: ("Pipeline OCR", 88.4))

    result = process_document(document_png_bytes, debug=True, languages="fra+eng")

    assert result.input_width == 700
    assert result.input_height == 900
    assert result.output_width > 0
    assert result.output_height > 0
    assert result.text == "Pipeline OCR"
    assert result.mean_confidence == 88.4
    assert result.languages == "fra+eng"
    assert result.scan_png_base64
    assert result.edges_png_base64
    assert result.contour_png_base64
    assert result.warped_png_base64

    for encoded in (
        result.scan_png_base64,
        result.edges_png_base64,
        result.contour_png_base64,
        result.warped_png_base64,
    ):
        assert encoded is not None
        assert base64.b64decode(encoded)


def test_process_document_without_debug_skips_optional_images(monkeypatch, document_png_bytes: bytes) -> None:
    from app.core import pipeline

    monkeypatch.setattr(pipeline, "extract_text", lambda image, languages: ("No Debug OCR", 91.0))

    result = process_document(document_png_bytes, debug=False, languages="fra+eng")

    assert result.scan_png_base64
    assert result.edges_png_base64 is None
    assert result.contour_png_base64 is None
    assert result.warped_png_base64 is None


def test_process_document_handles_low_contrast_photo(
    monkeypatch,
    low_contrast_document_jpg_bytes: bytes,
) -> None:
    from app.core import pipeline

    monkeypatch.setattr(pipeline, "extract_text", lambda image, languages: ("Low Contrast OCR", 72.5))

    result = process_document(low_contrast_document_jpg_bytes, debug=True, languages="eng")

    assert result.input_width == 700
    assert result.input_height == 900
    assert result.output_width > 0
    assert result.output_height > 0
    assert result.text == "Low Contrast OCR"
    assert result.mean_confidence == 72.5
    assert result.languages == "eng"
    assert result.scan_png_base64
    assert result.edges_png_base64
    assert result.contour_png_base64
    assert result.warped_png_base64
