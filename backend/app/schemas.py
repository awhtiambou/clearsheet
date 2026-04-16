from pydantic import BaseModel

class ScanMetadata(BaseModel):
    filename: str
    filetype: str
    size: int
    input_width: int
    input_height: int
    output_width: int
    output_height: int

class ScanImages(BaseModel):
    scan_png_base64: str
    edges_png_base64: str | None = None
    contour_png_base64: str | None = None
    warped_png_base64: str | None = None

class OcrResult(BaseModel):
    text: str
    mean_confidence: float
    languages: str

class ScanResponse(BaseModel):
    success: bool
    metadata: ScanMetadata
    images: ScanImages
    ocr: OcrResult

class ErrorDetail(BaseModel):
    code: str
    message: str