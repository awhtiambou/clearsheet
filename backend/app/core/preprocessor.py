import base64
import cv2
import numpy as np


def decode_image(file_bytes: bytes) -> np.ndarray:
    if not file_bytes:
        raise ValueError("invalid_image")

    buffer = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("invalid_image")
    return image

def resize_for_detection(image: np.ndarray, max_side: int = 1600) -> tuple[np.ndarray, float]:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")
    if max_side <= 0:
        raise ValueError("max_side_must_be_positive")

    height, width = image.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_side:
        return image.copy(), 1.0

    scale = longest_side / float(max_side)
    new_width = max(1, int(round(width / scale)))
    new_height = max(1, int(round(height / scale)))
    resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    return resized, scale

def preprocess_for_detection(image: np.ndarray) -> dict[str, np.ndarray]:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    blurred = cv2.GaussianBlur(normalized, (5, 5), 0)

    median_value = float(np.median(blurred))
    lower_edge_threshold = max(0, int(median_value * 0.66))
    upper_edge_threshold = min(255, int(median_value * 1.33))
    raw_edges = cv2.Canny(blurred, lower_edge_threshold, upper_edge_threshold)

    edge_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges = cv2.morphologyEx(raw_edges, cv2.MORPH_CLOSE, edge_kernel, iterations=2)
    edges = cv2.dilate(edges, edge_kernel, iterations=1)

    _, document_mask = cv2.threshold(
        blurred,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )
    document_mask = cv2.morphologyEx(
        document_mask,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11)),
        iterations=2,
    )
    document_mask = cv2.morphologyEx(
        document_mask,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)),
        iterations=1,
    )

    return {
        "gray": gray,
        "normalized": normalized,
        "blurred": blurred,
        "edges": edges,
        "document_mask": document_mask,
    }

def encode_png_base64(image: np.ndarray) -> str:
    if image is None or image.size == 0:
        raise ValueError("encode_failed")

    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise ValueError("encode_failed")
    return base64.b64encode(buffer.tobytes()).decode("utf-8")
