import cv2
import numpy as np

def order_points(points: np.ndarray) -> np.ndarray:
    pts = np.asarray(points, dtype="float32")
    if pts.shape != (4, 2):
        pts = pts.reshape(4, 2)

    # Sorting by y first gives a stable top/bottom split for document corners.
    sorted_by_y = pts[np.argsort(pts[:, 1])]
    top = sorted_by_y[:2][np.argsort(sorted_by_y[:2, 0])]
    bottom = sorted_by_y[2:][np.argsort(sorted_by_y[2:, 0])]

    top_left, top_right = top
    bottom_left, bottom_right = bottom
    return np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")

def warp_document(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")

    rect = order_points(points)
    top_left, top_right, bottom_right, bottom_left = rect

    width_a = np.linalg.norm(bottom_right - bottom_left)
    width_b = np.linalg.norm(top_right - top_left)
    height_a = np.linalg.norm(top_right - bottom_right)
    height_b = np.linalg.norm(top_left - bottom_left)

    max_width = max(1, int(round(max(width_a, width_b))))
    max_height = max(1, int(round(max(height_a, height_b))))

    destination = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(rect, destination)
    return cv2.warpPerspective(image, matrix, (max_width, max_height))
