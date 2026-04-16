from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DEFAULT_TESSERACT_PATH = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
LOCAL_TESSDATA_PATH = Path(__file__).resolve().parents[2] / "tessdata"

@dataclass(frozen=True)
class Settings:
    cors_origins: list[str]
    ocr_langs: str
    max_upload_mb: int
    app_name: str = "ClearSheet"
    tesseract_cmd: str = "tesseract"
    tessdata_prefix: str | None = None

def get_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    tesseract_cmd = os.getenv("TESSERACT_CMD")
    if not tesseract_cmd and DEFAULT_TESSERACT_PATH.exists():
        tesseract_cmd = str(DEFAULT_TESSERACT_PATH)
    tessdata_prefix = os.getenv("TESSDATA_PREFIX")
    if not tessdata_prefix and LOCAL_TESSDATA_PATH.exists():
        tessdata_prefix = str(LOCAL_TESSDATA_PATH)

    return Settings(
        cors_origins=[item.strip() for item in origins.split(",") if item.strip()],
        ocr_langs=os.getenv("OCR_LANGS", "fra+eng"),
        max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "10")),
        tesseract_cmd=tesseract_cmd or "tesseract",
        tessdata_prefix=tessdata_prefix,
    )
