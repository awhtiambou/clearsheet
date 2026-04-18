from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.pipeline import PipelineError, process_document
from app.core.postprocessor import validate_scan_mode
from app.core.settings import get_settings
from app.schemas import (
    BatchScanItem,
    BatchScanResponse,
    ErrorDetail,
    OcrResult,
    OcrToken,
    ScanImages,
    ScanMetadata,
    ScanResponse,
)

router = APIRouter()
settings = get_settings()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _resolve_scan_mode(scan_mode: str | None) -> str:
    requested_scan_mode = scan_mode or settings.scan_mode
    try:
        return validate_scan_mode(requested_scan_mode)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_scan_mode",
                "message": "The requested scan mode is unsupported.",
            },
        ) from exc


def _validate_payload(payload: bytes) -> None:
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "empty_file", "message": "The uploaded file is empty."},
        )
    if len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "file_too_large",
                "message": "The uploaded file exceeds the allowed size.",
            },
        )


def _build_scan_response(
    *,
    filename: str,
    filetype: str,
    payload: bytes,
    debug: bool,
    languages: str,
    scan_mode: str,
) -> ScanResponse:
    _validate_payload(payload)

    try:
        result = process_document(
            payload,
            debug=debug,
            languages=languages,
            scan_mode=scan_mode,
        )
    except ValueError as exc:
        if str(exc) == "invalid_scan_mode":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_scan_mode",
                    "message": "The requested scan mode is unsupported.",
                },
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_image", "message": "The uploaded file is not a valid image."},
        ) from exc
    except PipelineError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "ocr_unavailable", "message": str(exc)},
        ) from exc

    return ScanResponse(
        success=True,
        metadata=ScanMetadata(
            filename=filename,
            filetype=filetype,
            size=len(payload),
            input_width=result.input_width,
            input_height=result.input_height,
            output_width=result.output_width,
            output_height=result.output_height,
            scan_mode=result.scan_mode,
            rotation_correction_degrees=result.rotation_correction_degrees,
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
            tokens=[
                OcrToken(
                    text=token.text,
                    confidence=token.confidence,
                    x=token.x,
                    y=token.y,
                    width=token.width,
                    height=token.height,
                )
                for token in result.ocr_tokens
            ],
        ),
    )


def _error_detail_from_http_error(exc: HTTPException) -> ErrorDetail:
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    return ErrorDetail(
        code=str(detail.get("code", "scan_failed")),
        message=str(detail.get("message", "The upload could not be processed.")),
    )


@router.post("/api/v1/scan", response_model=ScanResponse)
async def scan_document(
    file: UploadFile = File(...),
    debug: bool = Form(True),
    ocr_langs: str | None = Form(None),
    scan_mode: str | None = Form(None),
) -> ScanResponse:
    payload = await file.read()
    languages = ocr_langs or settings.ocr_langs
    normalized_scan_mode = _resolve_scan_mode(scan_mode)

    return _build_scan_response(
        filename=file.filename or "upload",
        filetype=file.content_type or "application/octet-stream",
        payload=payload,
        debug=debug,
        languages=languages,
        scan_mode=normalized_scan_mode,
    )


@router.post("/api/v1/scan/batch", response_model=BatchScanResponse)
async def scan_documents(
    files: list[UploadFile] = File(...),
    debug: bool = Form(True),
    ocr_langs: str | None = Form(None),
    scan_mode: str | None = Form(None),
) -> BatchScanResponse:
    languages = ocr_langs or settings.ocr_langs
    normalized_scan_mode = _resolve_scan_mode(scan_mode)
    items: list[BatchScanItem] = []

    for file in files:
        filename = file.filename or "upload"
        filetype = file.content_type or "application/octet-stream"
        payload = await file.read()

        try:
            response = _build_scan_response(
                filename=filename,
                filetype=filetype,
                payload=payload,
                debug=debug,
                languages=languages,
                scan_mode=normalized_scan_mode,
            )
            items.append(
                BatchScanItem(
                    filename=filename,
                    success=True,
                    metadata=response.metadata,
                    images=response.images,
                    ocr=response.ocr,
                )
            )
        except HTTPException as exc:
            items.append(
                BatchScanItem(
                    filename=filename,
                    success=False,
                    error=_error_detail_from_http_error(exc),
                )
            )

    return BatchScanResponse(
        success=all(item.success for item in items),
        items=items,
    )
