from dataclasses import dataclass
from app.core.preprocessor import decode_image, resize_for_detection, preprocess_for_detection, encode_png_base64
from app.core.detector import find_document_contour, draw_contour_overlay
from app.core.transformer import auto_rotate_document, warp_document
from app.core.postprocessor import OcrToken, build_scan_image, extract_text, validate_scan_mode

class PipelineError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)

@dataclass
class ScanResult:
    input_width: int
    input_height: int
    output_width: int
    output_height: int
    scan_mode: str
    rotation_correction_degrees: float
    scan_png_base64: str
    edges_png_base64: str | None
    contour_png_base64: str | None
    warped_png_base64: str | None
    text: str
    mean_confidence: float
    languages: str
    ocr_tokens: list[OcrToken]


def process_document(
    file_bytes: bytes,
    debug: bool,
    languages: str,
    scan_mode: str = "balanced",
) -> ScanResult:
    original = decode_image(file_bytes)
    input_height, input_width = original.shape[:2]
    normalized_scan_mode = validate_scan_mode(scan_mode)

    resized, scale = resize_for_detection(original)
    stages = preprocess_for_detection(resized)
    contour = find_document_contour(stages["edges"], stages.get("document_mask"))
    if contour is None:
        raise PipelineError("document_not_found", "No 4-point document contour was detected.")

    contour_full = contour * scale
    warped = warp_document(original, contour_full)
    corrected, rotation_correction_degrees = auto_rotate_document(warped)
    scan = build_scan_image(corrected, scan_mode=normalized_scan_mode)
    ocr = extract_text(corrected, scan, languages, scan_mode=normalized_scan_mode)

    return ScanResult(
        input_width=input_width,
        input_height=input_height,
        output_width=scan.shape[1],
        output_height=scan.shape[0],
        scan_mode=normalized_scan_mode,
        rotation_correction_degrees=round(rotation_correction_degrees, 2),
        scan_png_base64=encode_png_base64(scan),
        edges_png_base64=encode_png_base64(stages["edges"]) if debug else None,
        contour_png_base64=encode_png_base64(draw_contour_overlay(resized, contour)) if debug else None,
        warped_png_base64=encode_png_base64(corrected) if debug else None,
        text=ocr.text,
        mean_confidence=ocr.mean_confidence,
        languages=languages,
        ocr_tokens=ocr.tokens,
    )
