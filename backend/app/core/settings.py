from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    cors_origins: list[str]
    ocr_langs: str
    max_upload_mb: int
    app_name: str = "ClearSheet"
    tesseract_cmd: str = os.getenv("TESSERACT_CMD", "tesseract")

def get_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return Settings(
        cors_origins=[item.strip() for item in origins.split(",") if item.strip()],
        ocr_langs=os.getenv("OCR_LANGS", "fra+eng"),
        max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "10")),
    )
