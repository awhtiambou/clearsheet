import cv2
import numpy as np
import pytesseract
from pytesseract import Output

def build_scan_image(warped: np.ndarray) -> np.ndarray:
    pass

def extract_text(scan_image: np.ndarray, languages: str) -> tuple[str, float]:
    pass