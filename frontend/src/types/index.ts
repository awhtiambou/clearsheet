export type ScanMode = "clean" | "balanced" | "ocr-optimized";

export type ScanMetadata = {
  filename: string;
  filetype: string;
  size: number;
  input_width: number;
  input_height: number;
  output_width: number;
  output_height: number;
  scan_mode: ScanMode;
  rotation_correction_degrees: number;
};

export type ScanImages = {
  scan_png_base64: string;
  edges_png_base64?: string | null;
  contour_png_base64?: string | null;
  warped_png_base64?: string | null;
};

export type OcrToken = {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrResult = {
  text: string;
  mean_confidence: number;
  languages: string;
  tokens: OcrToken[];
};

export type ScanResponse = {
  success: boolean;
  metadata: ScanMetadata;
  images: ScanImages;
  ocr: OcrResult;
};

export type ScanErrorDetail = {
  code?: string;
  message?: string;
};

export type BatchScanItem = {
  filename: string;
  success: boolean;
  metadata?: ScanMetadata | null;
  images?: ScanImages | null;
  ocr?: OcrResult | null;
  error?: ScanErrorDetail | null;
};

export type BatchScanResponse = {
  success: boolean;
  items: BatchScanItem[];
};

export type ApiErrorResponse = {
  detail?: ScanErrorDetail;
};
