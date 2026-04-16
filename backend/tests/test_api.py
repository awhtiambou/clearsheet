from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_scan_document_returns_full_response(monkeypatch, document_png_bytes: bytes) -> None:
    from app.core import pipeline

    monkeypatch.setattr(pipeline, "extract_text", lambda image, languages: ("Bonjour OCR 123", 96.2))

    response = client.post(
        "/api/v1/scan",
        files={"file": ("synthetic.png", document_png_bytes, "image/png")},
        data={"debug": "true", "ocr_langs": "fra+eng"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["metadata"]["filename"] == "synthetic.png"
    assert payload["metadata"]["filetype"] == "image/png"
    assert payload["metadata"]["size"] == len(document_png_bytes)
    assert payload["metadata"]["input_width"] == 700
    assert payload["metadata"]["input_height"] == 900
    assert payload["metadata"]["output_width"] > 0
    assert payload["metadata"]["output_height"] > 0
    assert payload["images"]["scan_png_base64"]
    assert payload["images"]["edges_png_base64"]
    assert payload["images"]["contour_png_base64"]
    assert payload["images"]["warped_png_base64"]
    assert payload["ocr"]["text"] == "Bonjour OCR 123"
    assert payload["ocr"]["mean_confidence"] == 96.2
    assert payload["ocr"]["languages"] == "fra+eng"


def test_scan_document_rejects_invalid_image() -> None:
    response = client.post(
        "/api/v1/scan",
        files={"file": ("broken.txt", b"not-an-image", "text/plain")},
        data={"debug": "true", "ocr_langs": "fra+eng"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_image"


def test_scan_document_returns_document_not_found(monkeypatch) -> None:
    from app.api import routes
    from app.core.pipeline import PipelineError

    def raise_not_found(*args, **kwargs):
        raise PipelineError("document_not_found", "No 4-point document contour was detected.")

    monkeypatch.setattr(routes, "process_document", raise_not_found)

    response = client.post(
        "/api/v1/scan",
        files={"file": ("plain.png", b"123", "image/png")},
        data={"debug": "true", "ocr_langs": "fra+eng"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "document_not_found"


def test_scan_document_returns_ocr_unavailable(monkeypatch, document_png_bytes: bytes) -> None:
    from app.api import routes

    def raise_runtime(*args, **kwargs):
        raise RuntimeError("Tesseract is unavailable for tests.")

    monkeypatch.setattr(routes, "process_document", raise_runtime)

    response = client.post(
        "/api/v1/scan",
        files={"file": ("synthetic.png", document_png_bytes, "image/png")},
        data={"debug": "true", "ocr_langs": "fra+eng"},
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "ocr_unavailable"
