from dataclasses import dataclass
from app.core.preprocessor import decode_image, resize_for_detection, preprocess_for_detection, encode_png_base64
from app.core.detector import find_document_contour, draw_contour_overlay
from app.core.transformer import warp_document
from app.core.postprocessor import build_scan_image, extract_text

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
    scan_png_base64: str
    edges_png_base64: str | None
    contour_png_base64: str | None
    warped_png_base64: str | None
    text: str
    mean_confidence: float
    languages: str

def process_document(file_bytes: bytes, debug: bool, languages: str) -> ScanResult:
    original = decode_image(file_bytes)
    input_height, input_width = original.shape[:2]

    resized, scale = resize_for_detection(original)
    stages = preprocess_for_detection(resized)
    contour = find_document_contour(stages["edges"])
    if contour is None:
        raise PipelineError("document_not_found", "No 4-point document contour was detected.")

    contour_full = contour * scale
    warped = warp_document(original, contour_full)
    scan = build_scan_image(warped)
    text, mean_confidence = extract_text(scan, languages)

    return ScanResult(
        input_width=input_width,
        input_height=input_height,
        output_width=scan.shape[1],
        output_height=scan.shape[0],
        scan_png_base64=encode_png_base64(scan),
        edges_png_base64=encode_png_base64(stages["edges"]) if debug else None,
        contour_png_base64=encode_png_base64(draw_contour_overlay(resized, contour)) if debug else None,
        warped_png_base64=encode_png_base64(warped) if debug else None,
        text=text,
        mean_confidence=mean_confidence,
        languages=languages,
    )
