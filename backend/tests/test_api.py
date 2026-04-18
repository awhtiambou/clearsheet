from fastapi.testclient import TestClient

from app.core.pipeline import ScanResult
from app.core.postprocessor import OcrToken
from app.main import app


client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_scan_document_returns_full_response(monkeypatch, document_png_bytes: bytes) -> None:
    from app.api import routes

    monkeypatch.setattr(
        routes,
        "process_document",
        lambda payload, debug, languages, scan_mode: ScanResult(
            input_width=700,
            input_height=900,
            output_width=1288,
            output_height=1400,
            scan_mode=scan_mode,
            rotation_correction_degrees=-1.75,
            scan_png_base64="scan-image",
            edges_png_base64="edges-image",
            contour_png_base64="contour-image",
            warped_png_base64="warped-image",
            text="Bonjour OCR 123",
            mean_confidence=96.2,
            languages=languages,
            ocr_tokens=[
                OcrToken(
                    text="Bonjour",
                    confidence=97.5,
                    x=0.1,
                    y=0.1,
                    width=0.2,
                    height=0.04,
                )
            ],
        ),
    )

    response = client.post(
        "/api/v1/scan",
        files={"file": ("synthetic.png", document_png_bytes, "image/png")},
        data={"debug": "true", "ocr_langs": "fra+eng", "scan_mode": "ocr-optimized"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["metadata"]["filename"] == "synthetic.png"
    assert payload["metadata"]["filetype"] == "image/png"
    assert payload["metadata"]["size"] == len(document_png_bytes)
    assert payload["metadata"]["input_width"] == 700
    assert payload["metadata"]["input_height"] == 900
    assert payload["metadata"]["output_width"] == 1288
    assert payload["metadata"]["output_height"] == 1400
    assert payload["metadata"]["scan_mode"] == "ocr-optimized"
    assert payload["metadata"]["rotation_correction_degrees"] == -1.75
    assert payload["images"]["scan_png_base64"] == "scan-image"
    assert payload["images"]["edges_png_base64"] == "edges-image"
    assert payload["images"]["contour_png_base64"] == "contour-image"
    assert payload["images"]["warped_png_base64"] == "warped-image"
    assert payload["ocr"]["text"] == "Bonjour OCR 123"
    assert payload["ocr"]["mean_confidence"] == 96.2
    assert payload["ocr"]["languages"] == "fra+eng"
    assert payload["ocr"]["tokens"][0]["text"] == "Bonjour"


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


def test_batch_scan_returns_per_file_results(monkeypatch, document_png_bytes: bytes) -> None:
    from app.api import routes

    def fake_process_document(payload, debug, languages, scan_mode):
        if payload == b"broken-file":
            raise ValueError("invalid_image")

        return ScanResult(
            input_width=700,
            input_height=900,
            output_width=1024,
            output_height=1380,
            scan_mode=scan_mode,
            rotation_correction_degrees=0.0,
            scan_png_base64="batch-scan",
            edges_png_base64=None,
            contour_png_base64=None,
            warped_png_base64=None,
            text="Batch OCR",
            mean_confidence=83.0,
            languages=languages,
            ocr_tokens=[],
        )

    monkeypatch.setattr(routes, "process_document", fake_process_document)

    response = client.post(
        "/api/v1/scan/batch",
        files=[
            ("files", ("first.png", document_png_bytes, "image/png")),
            ("files", ("broken.txt", b"broken-file", "text/plain")),
        ],
        data={"debug": "false", "ocr_langs": "eng", "scan_mode": "clean"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is False
    assert len(payload["items"]) == 2
    assert payload["items"][0]["success"] is True
    assert payload["items"][0]["metadata"]["scan_mode"] == "clean"
    assert payload["items"][1]["success"] is False
    assert payload["items"][1]["error"]["code"] == "invalid_image"
