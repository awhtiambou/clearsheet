export type ScanResponse = {
  success: boolean;
  metadata: {
    filename: string;
    filetype: string;
    size: number;
    input_width: number;
    input_height: number;
    output_width: number;
    output_height: number;
  };
  images: {
    scan_png_base64: string;
    edges_png_base64?: string | null;
    contour_png_base64?: string | null;
    warped_png_base64?: string | null;
  };
  ocr: {
    text: string;
    mean_confidence: number;
    languages: string;
  };
};

export type ApiErrorResponse = {
  detail?: {
    code?: string;
    message?: string;
  };
};
