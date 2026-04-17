from pathlib import Path
import shutil

import cv2
import numpy as np
import pytest

from app.core.settings import get_settings


def build_document_image() -> np.ndarray:
    image = np.full((900, 700, 3), 35, dtype=np.uint8)
    cv2.rectangle(image, (110, 90), (600, 790), (245, 245, 245), -1)
    cv2.putText(
        image,
        "Bonjour OCR 123",
        (150, 340),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.35,
        (20, 20, 20),
        3,
        cv2.LINE_AA,
    )
    cv2.putText(
        image,
        "Scan pipeline test",
        (145, 430),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (20, 20, 20),
        2,
        cv2.LINE_AA,
    )
    cv2.line(image, (145, 500), (560, 500), (30, 30, 30), 2)
    cv2.line(image, (145, 560), (560, 560), (30, 30, 30), 2)
    return image


def encode_png_bytes(image: np.ndarray) -> bytes:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise RuntimeError("Failed to encode synthetic test image.")
    return buffer.tobytes()


def encode_jpg_bytes(image: np.ndarray, quality: int = 84) -> bytes:
    success, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not success:
        raise RuntimeError("Failed to encode synthetic JPG image.")
    return buffer.tobytes()


def build_low_contrast_document_photo() -> np.ndarray:
    scene = np.full((900, 700, 3), 186, dtype=np.uint8)

    for start, end in (
        ((0, 180), (699, 150)),
        ((0, 610), (699, 575)),
        ((190, 0), (150, 899)),
        ((520, 0), (485, 899)),
    ):
        cv2.line(scene, start, end, (160, 160, 160), 6, cv2.LINE_AA)

    document = np.full((760, 540, 3), 236, dtype=np.uint8)
    cv2.putText(
        document,
        "Windows Printer Test Page",
        (55, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (110, 110, 110),
        2,
        cv2.LINE_AA,
    )
    for index, text in enumerate(
        (
            "System Information",
            "Driver Version 4.1.0",
            "Port USB001",
            "Scan quality verification",
            "Low contrast synthetic photo",
        )
    ):
        cv2.putText(
            document,
            text,
            (60, 220 + index * 70),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.85,
            (118, 118, 118),
            2,
            cv2.LINE_AA,
        )

    for line_y in range(470, 700, 45):
        cv2.line(document, (60, line_y), (470, line_y), (185, 185, 185), 2, cv2.LINE_AA)

    source_points = np.array(
        [[0, 0], [539, 0], [539, 759], [0, 759]],
        dtype="float32",
    )
    destination_points = np.array(
        [[160, 165], [545, 130], [608, 820], [214, 848]],
        dtype="float32",
    )
    transform = cv2.getPerspectiveTransform(source_points, destination_points)

    warped_document = cv2.warpPerspective(document, transform, (700, 900))
    warped_mask = cv2.warpPerspective(
        np.full((760, 540), 255, dtype=np.uint8),
        transform,
        (700, 900),
    )

    mask = warped_mask > 0
    scene[mask] = warped_document[mask]

    noise = np.random.default_rng(42).normal(0, 3, scene.shape).astype(np.int16)
    scene = np.clip(scene.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    scene = cv2.GaussianBlur(scene, (5, 5), 0.8)
    return scene


@pytest.fixture
def document_png_bytes() -> bytes:
    return encode_png_bytes(build_document_image())


@pytest.fixture
def low_contrast_document_jpg_bytes() -> bytes:
    return encode_jpg_bytes(build_low_contrast_document_photo())


def has_tesseract() -> bool:
    settings = get_settings()
    command_path = Path(settings.tesseract_cmd)
    has_binary = command_path.exists() or shutil.which(settings.tesseract_cmd) is not None
    if not has_binary:
        return False

    tessdata_prefix = settings.tessdata_prefix
    if not tessdata_prefix:
        return False

    fra_path = Path(tessdata_prefix) / "fra.traineddata"
    eng_path = Path(tessdata_prefix) / "eng.traineddata"
    return fra_path.exists() and eng_path.exists()
