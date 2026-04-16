from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from app.core.pipeline import PipelineError, process_document
from app.core.settings import get_settings
from app.schemas import ScanImages, ScanMetadata, OcrResult, ScanResponse

router = APIRouter()
settings = get_settings()

@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@router.post("/api/v1/scan", response_model=ScanResponse)
async def scan_document(
    file: UploadFile = File(...),
    debug: bool = Form(True),
    ocr_langs: str | None = Form(None),
) -> ScanResponse:
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "empty_file", "message": "The uploaded file is empty."})
    if len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "file_too_large", "message": "The uploaded file exceeds the allowed size."})

    try:
        result = process_document(payload, debug=debug, languages=ocr_langs or settings.ocr_langs)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": "invalid_image", "message": "The uploaded file is not a valid image."})
    except PipelineError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"code": exc.code, "message": exc.message})

    return ScanResponse(
        success=True,
        metadata=ScanMetadata(
            input_width=result.input_width,
            input_height=result.input_height,
            output_width=result.output_width,
            output_height=result.output_height,
        ),
        images=ScanImages(
            scan_png_base64=result.scan_png_base64,
            edges_png_base64=result.edges_png_base64,
            contour_png_base64=result.contour_png_base64,
            warped_png_base64=result.warped_png_base64,
        ),
        ocr=OcrResult(
            text=result.text,
            mean_confidence=result.mean_confidence,
            languages=result.languages,
        ),
    )
