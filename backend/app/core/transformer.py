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


def estimate_rotation_angle(image: np.ndarray, max_angle: float = 12.0) -> float:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")
    if max_angle <= 0:
        raise ValueError("max_angle_must_be_positive")

    gray = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    blurred = cv2.GaussianBlur(normalized, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    min_line_length = max(40, int(round(min(edges.shape[:2]) * 0.18)))
    lines = cv2.HoughLinesP(
        edges,
        1,
        np.pi / 180,
        threshold=max(40, min(edges.shape[:2]) // 5),
        minLineLength=min_line_length,
        maxLineGap=max(12, min_line_length // 4),
    )

    if lines is None:
        return 0.0

    weighted_angles: list[float] = []
    weights: list[float] = []

    for line in lines.reshape(-1, 4):
        x1, y1, x2, y2 = line
        dx = float(x2 - x1)
        dy = float(y2 - y1)
        length = float(np.hypot(dx, dy))
        if length < min_line_length:
            continue

        angle = float(np.degrees(np.arctan2(dy, dx)))
        if angle <= -90:
            angle += 180
        elif angle > 90:
            angle -= 180
        if abs(angle) > max_angle:
            continue

        weighted_angles.append(angle)
        weights.append(length)

    if not weighted_angles:
        return 0.0

    weights_array = np.asarray(weights, dtype=np.float32)
    angles_array = np.asarray(weighted_angles, dtype=np.float32)
    median_angle = float(np.median(angles_array))
    inlier_mask = np.abs(angles_array - median_angle) <= max(1.5, max_angle * 0.35)

    if not np.any(inlier_mask):
        return 0.0

    return float(np.average(angles_array[inlier_mask], weights=weights_array[inlier_mask]))


def rotate_image(image: np.ndarray, angle_degrees: float) -> np.ndarray:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")

    height, width = image.shape[:2]
    center = (width / 2.0, height / 2.0)
    matrix = cv2.getRotationMatrix2D(center, angle_degrees, 1.0)
    cos = abs(matrix[0, 0])
    sin = abs(matrix[0, 1])

    rotated_width = max(1, int(round(height * sin + width * cos)))
    rotated_height = max(1, int(round(height * cos + width * sin)))

    matrix[0, 2] += rotated_width / 2.0 - center[0]
    matrix[1, 2] += rotated_height / 2.0 - center[1]

    border_value: int | tuple[int, int, int]
    if image.ndim == 2:
        border_value = 255
    else:
        border_value = (255, 255, 255)

    return cv2.warpAffine(
        image,
        matrix,
        (rotated_width, rotated_height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=border_value,
    )


def auto_rotate_document(
    image: np.ndarray,
    max_angle: float = 12.0,
    min_correction_angle: float = 0.35,
) -> tuple[np.ndarray, float]:
    if image is None or image.size == 0:
        raise ValueError("invalid_image")
    if min_correction_angle < 0:
        raise ValueError("min_correction_angle_must_be_non_negative")

    estimated_angle = estimate_rotation_angle(image, max_angle=max_angle)
    correction_angle = -estimated_angle

    if abs(correction_angle) < min_correction_angle:
        return image.copy(), 0.0

    return rotate_image(image, correction_angle), correction_angle
