import cv2
import numpy as np


def _largest_document_candidate(
    binary_image: np.ndarray,
    min_area: float,
    retrieval_mode: int,
) -> np.ndarray | None:
    contours, _ = cv2.findContours(binary_image.copy(), retrieval_mode, cv2.CHAIN_APPROX_SIMPLE)
    sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)

    fallback_box: np.ndarray | None = None
    for contour in sorted_contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter == 0:
            continue

        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(polygon) == 4 and cv2.isContourConvex(polygon):
            return polygon.reshape(4, 2).astype("float32")

        if fallback_box is None:
            rect = cv2.minAreaRect(contour)
            box = cv2.boxPoints(rect).astype("float32")
            if cv2.contourArea(box) >= min_area:
                fallback_box = box

    return fallback_box


def find_document_contour(
    edges: np.ndarray,
    document_mask: np.ndarray | None = None,
    min_area_ratio: float = 0.20,
) -> np.ndarray | None:
    if edges is None or edges.size == 0:
        raise ValueError("invalid_edges")
    if not 0 < min_area_ratio <= 1:
        raise ValueError("min_area_ratio_must_be_between_0_and_1")
    if document_mask is not None and document_mask.size == 0:
        raise ValueError("invalid_document_mask")
    if document_mask is not None and document_mask.shape[:2] != edges.shape[:2]:
        raise ValueError("document_mask_shape_mismatch")

    image_area = float(edges.shape[0] * edges.shape[1])
    min_area = image_area * min_area_ratio

    if document_mask is not None:
        mask_candidate = _largest_document_candidate(document_mask, min_area, cv2.RETR_EXTERNAL)
        if mask_candidate is not None:
            return mask_candidate

    return _largest_document_candidate(edges, min_area, cv2.RETR_LIST)

def draw_contour_overlay(image: np.ndarray, contour: np.ndarray) -> np.ndarray:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")
    if contour is None or np.asarray(contour).size != 8:
        raise ValueError("invalid_contour")

    overlay = image.copy()
    if overlay.ndim == 2:
        overlay = cv2.cvtColor(overlay, cv2.COLOR_GRAY2BGR)

    contour_points = np.asarray(contour, dtype=np.int32).reshape(4, 2)
    cv2.drawContours(overlay, [contour_points], -1, (0, 255, 0), 4)
    for point in contour_points:
        cv2.circle(overlay, tuple(point), 8, (0, 140, 255), -1)
    return overlay
