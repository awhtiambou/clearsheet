import cv2
import numpy as np

from app.core.transformer import (
    auto_rotate_document,
    estimate_rotation_angle,
    order_points,
    rotate_image,
    warp_document,
)


def test_order_points_returns_tl_tr_br_bl() -> None:
    points = np.array(
        [[320, 320], [90, 330], [300, 100], [100, 100]],
        dtype="float32",
    )

    ordered = order_points(points)

    expected = np.array(
        [[100, 100], [300, 100], [320, 320], [90, 330]],
        dtype="float32",
    )
    assert np.allclose(ordered, expected)


def test_warp_document_returns_non_empty_image() -> None:
    image = np.zeros((500, 500, 3), dtype=np.uint8)
    image[100:400, 140:360] = (255, 255, 255)

    points = np.array(
        [[145, 110], [350, 100], [360, 390], [130, 400]],
        dtype="float32",
    )

    warped = warp_document(image, points)

    assert warped.size > 0
    assert warped.shape[0] > 0
    assert warped.shape[1] > 0
    assert warped.mean() > 0


def test_auto_rotate_document_reduces_detected_skew() -> None:
    image = np.full((500, 900), 255, dtype=np.uint8)
    for line_y in range(120, 420, 55):
        cv2.line(image, (120, line_y), (780, line_y), (0,), 4, cv2.LINE_AA)
    cv2.putText(
        image,
        "Rotation test",
        (180, 220),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.2,
        (0,),
        3,
        cv2.LINE_AA,
    )

    skewed = rotate_image(image, 6.5)
    estimated_before = estimate_rotation_angle(skewed)
    corrected, correction_angle = auto_rotate_document(skewed)
    estimated_after = estimate_rotation_angle(corrected)

    assert abs(estimated_before) > 3.0
    assert correction_angle != 0
    assert abs(estimated_after) < abs(estimated_before)
