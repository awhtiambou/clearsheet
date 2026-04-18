import type { IconType } from "react-icons";
import {
  FiArrowUpRight,
  FiFileText,
  FiLayers,
  FiPackage,
  FiSearch,
  FiZap,
} from "react-icons/fi";

import type {
  BatchScanItem,
  ScanImages,
  ScanMetadata,
  ScanMode,
  ScanResponse,
} from "@/src/types";

export type StageCard = {
  label: string;
  description: string;
  image: string | null | undefined;
};

export type OcrLanguageOption = {
  label: string;
  value: string;
};

export type ScanModeOption = {
  label: string;
  value: ScanMode;
  note: string;
};

type ScanLikeResult = {
  images?: ScanImages | null;
  metadata?: ScanMetadata | null;
} | null;

export const labelChipStyle = {
  borderColor: "rgba(189, 195, 199, 0.55)",
  bgcolor: "rgba(255,255,255,0.65)",
  color: "#2C3E50",
};

export const heroChips: Array<{ icon: IconType; label: string }> = [
  { icon: FiSearch, label: "Document Geometry" },
  { icon: FiZap, label: "Adaptive Threshold" },
  { icon: FiFileText, label: "Searchable PDF" },
];

export const heroHighlights = [
  {
    label: "Perspective",
    value: "Warp & align",
    note: "Quadrilateral detection with auto-rotation correction after the warp.",
  },
  {
    label: "Scan Modes",
    value: "3 profiles",
    note: "Switch between clean, balanced, and OCR-optimized rendering.",
  },
  {
    label: "Batch Flow",
    value: "Queue & review",
    note: "Process multiple uploads and inspect each result in one workspace.",
  },
];

export const workflowSteps = [
  "1. Drag in one photo or a whole batch of document shots",
  "2. Choose OCR languages and the scan mode that fits the task",
  "3. Review each result, debug snapshots, transcript, and searchable PDF export",
];

export const workflowDetails = [
  { label: "Theme", value: "Paper calm" },
  { label: "Fonts", value: "Work Sans / Playfair / Mono" },
  { label: "Toolkit", value: "Tailwind + MUI" },
  { label: "Batch", value: "Multi-document" },
];

export const workflowPreviewIcon = FiArrowUpRight;

export const inputFeatureCards: Array<{
  icon: IconType;
  label: string;
  value: string;
  note: string;
}> = [
  {
    icon: FiLayers,
    label: "Debug mode",
    value: "Optional",
    note: "Turn stage snapshots on when you want to inspect detection, contour, and warp output.",
  },
  {
    icon: FiZap,
    label: "Scan profiles",
    value: "3 modes",
    note: "Render for visual cleanliness, balance, or OCR-first readability.",
  },
  {
    icon: FiPackage,
    label: "Delivery",
    value: "PNG + searchable PDF",
    note: "Export the cleaned scan as an image or as a PDF with an OCR text layer.",
  },
];

export const ocrLanguageOptions: OcrLanguageOption[] = [
  { label: "French + English", value: "fra+eng" },
  { label: "English only", value: "eng" },
  { label: "French only", value: "fra" },
];

export const scanModeOptions: ScanModeOption[] = [
  {
    label: "Balanced",
    value: "balanced",
    note: "General-purpose scan with steady contrast and reliable OCR.",
  },
  {
    label: "Clean",
    value: "clean",
    note: "A calmer white-page look with stronger cleanup for presentation shots.",
  },
  {
    label: "OCR Optimized",
    value: "ocr-optimized",
    note: "Pushes text separation harder for difficult photos and OCR extraction.",
  },
];

export function buildStageCards(result: ScanResponse | BatchScanItem | null): StageCard[] {
  const scanLike = toScanLikeResult(result);

  return [
    {
      label: "Edges",
      description: "Contours prepared for quadrilateral detection.",
      image: scanLike?.images?.edges_png_base64,
    },
    {
      label: "Contour",
      description: "Largest valid document boundary kept in view.",
      image: scanLike?.images?.contour_png_base64,
    },
    {
      label: "Warped",
      description: "Perspective corrected and auto-rotated before the scan effect.",
      image: scanLike?.images?.warped_png_base64,
    },
  ];
}

function toScanLikeResult(result: ScanResponse | BatchScanItem | null): ScanLikeResult {
  if (!result) {
    return null;
  }

  if ("metadata" in result && "images" in result) {
    return result;
  }

  return result.success ? result : null;
}
