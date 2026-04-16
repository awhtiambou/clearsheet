import numpy as np

from app.core.transformer import order_points, warp_document


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
