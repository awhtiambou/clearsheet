import base64
import cv2
import numpy as np

def decode_image(file_bytes: bytes) -> np.ndarray:
    pass

def resize_for_detection(image: np.ndarray, max_side: int = 1600) -> tuple[np.ndarray, float]:
    pass

def preprocess_for_detection(image: np.ndarray) -> dict[str, np.ndarray]:
    pass

def encode_png_base64(image: np.ndarray) -> str:
    pass