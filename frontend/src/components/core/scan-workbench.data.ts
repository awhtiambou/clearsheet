import type { IconType } from "react-icons";
import {
  FiArrowUpRight,
  FiFileText,
  FiImage,
  FiLayers,
  FiSearch,
  FiZap,
} from "react-icons/fi";

import type { ScanResponse } from "@/src/types";

export type StageCard = {
  label: string;
  description: string;
  image: string | null | undefined;
};

export const labelChipStyle = {
  borderColor: "rgba(189, 195, 199, 0.55)",
  bgcolor: "rgba(255,255,255,0.65)",
  color: "#2C3E50",
};

export const heroChips: Array<{ icon: IconType; label: string }> = [
  { icon: FiSearch, label: "Document Geometry" },
  { icon: FiZap, label: "Adaptive Threshold" },
  { icon: FiFileText, label: "OCR fra+eng" },
];

export const heroHighlights = [
  {
    label: "Perspective",
    value: "Warp & align",
    note: "Quadrilateral detection with a visible debug trail.",
  },
  {
    label: "Scan Effect",
    value: "High contrast",
    note: "A calmer paper look with thresholded output.",
  },
  {
    label: "OCR Output",
    value: "Readable text",
    note: "Confidence and transcript stay beside the result.",
  },
];

export const workflowSteps = [
  "1. Upload a photo with perspective and background noise",
  "2. Trigger scan + OCR from the FastAPI backend",
  "3. Inspect the cleaned sheet and every debug stage",
];

export const workflowDetails = [
  { label: "Theme", value: "Paper calm" },
  { label: "Fonts", value: "Work Sans / Playfair / Mono" },
  { label: "Toolkit", value: "Tailwind + MUI" },
  { label: "Motion", value: "Framer Motion" },
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
    value: "Enabled",
    note: "Contours, edges, and warp previews stay visible.",
  },
  {
    icon: FiFileText,
    label: "OCR languages",
    value: "fra + eng",
    note: "Bilingual-ready defaults aligned with the backend.",
  },
  {
    icon: FiImage,
    label: "Delivery",
    value: "PNG scan",
    note: "Clean export optimized for reading and OCR review.",
  },
];

export function buildStageCards(result: ScanResponse | null): StageCard[] {
  return [
    {
      label: "Edges",
      description: "Contours prepared for quadrilateral detection.",
      image: result?.images.edges_png_base64,
    },
    {
      label: "Contour",
      description: "Largest valid document boundary kept in view.",
      image: result?.images.contour_png_base64,
    },
    {
      label: "Warped",
      description: "Perspective corrected before the scan effect.",
      image: result?.images.warped_png_base64,
    },
  ];
}
