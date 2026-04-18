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
    scan_mode: str
    app_name: str = "ClearSheet"
    tesseract_cmd: str = "tesseract"
    tessdata_prefix: str | None = None


def _get_env(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value is not None:
            return value
    return default


def get_settings() -> Settings:
    origins = _get_env("CORS_ORIGINS", "CORSORIGINS", default="http://localhost:3000")
    tesseract_cmd = _get_env("TESSERACT_CMD", "TESSERACTCMD")
    if not tesseract_cmd and DEFAULT_TESSERACT_PATH.exists():
        tesseract_cmd = str(DEFAULT_TESSERACT_PATH)
    tessdata_prefix = _get_env("TESSDATA_PREFIX", "TESSDATAPREFIX")
    if not tessdata_prefix and LOCAL_TESSDATA_PATH.exists():
        tessdata_prefix = str(LOCAL_TESSDATA_PATH)

    return Settings(
        cors_origins=[item.strip() for item in origins.split(",") if item.strip()],
        ocr_langs=_get_env("OCR_LANGS", "OCRLANGS", default="fra+eng") or "fra+eng",
        max_upload_mb=int(_get_env("MAX_UPLOAD_MB", "MAXUPLOADMB", default="10") or "10"),
        scan_mode=_get_env("SCAN_MODE", "SCANMODE", default="balanced") or "balanced",
        tesseract_cmd=tesseract_cmd or "tesseract",
        tessdata_prefix=tessdata_prefix,
    )
