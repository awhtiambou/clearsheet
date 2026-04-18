from pydantic import BaseModel, Field

class ScanMetadata(BaseModel):
    filename: str
    filetype: str
    size: int
    input_width: int
    input_height: int
    output_width: int
    output_height: int
    scan_mode: str
    rotation_correction_degrees: float

class ScanImages(BaseModel):
    scan_png_base64: str
    edges_png_base64: str | None = None
    contour_png_base64: str | None = None
    warped_png_base64: str | None = None


class OcrToken(BaseModel):
    text: str
    confidence: float
    x: float
    y: float
    width: float
    height: float

class OcrResult(BaseModel):
    text: str
    mean_confidence: float
    languages: str
    tokens: list[OcrToken] = Field(default_factory=list)

class ScanResponse(BaseModel):
    success: bool
    metadata: ScanMetadata
    images: ScanImages
    ocr: OcrResult

class ErrorDetail(BaseModel):
    code: str
    message: str


class BatchScanItem(BaseModel):
    filename: str
    success: bool
    metadata: ScanMetadata | None = None
    images: ScanImages | None = None
    ocr: OcrResult | None = None
    error: ErrorDetail | None = None


class BatchScanResponse(BaseModel):
    success: bool
    items: list[BatchScanItem] = Field(default_factory=list)
