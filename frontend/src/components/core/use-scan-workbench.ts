"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { API_BASE_URL, toDataUrl } from "@/src/config";
import type {
  ApiErrorResponse,
  BatchScanItem,
  BatchScanResponse,
  ScanMode,
  ScanResponse,
} from "@/src/types";

import { buildStageCards } from "./scan-workbench.data";
import { buildDemoSampleFile } from "./scan-workbench.samples";
import { downloadDataUrl, downloadDataUrlAsPdf } from "./scan-export";

const DEFAULT_OCR_LANGS = "fra+eng";
const DEFAULT_SCAN_MODE: ScanMode = "balanced";

type UploadSource = "local" | "sample";

export type WorkbenchUpload = {
  file: File;
  id: string;
  previewUrl: string;
  result: BatchScanItem | null;
  source: UploadSource;
};

export function useScanWorkbench() {
  const [debugEnabled, setDebugEnabled] = useState(true);
  const [ocrLanguages, setOcrLanguages] = useState(DEFAULT_OCR_LANGS);
  const [scanMode, setScanMode] = useState<ScanMode>(DEFAULT_SCAN_MODE);
  const [uploads, setUploads] = useState<WorkbenchUpload[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingSample, setIsPreparingSample] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dragDepthRef = useRef(0);
  const uploadsRef = useRef<WorkbenchUpload[]>([]);

  const activeUpload =
    uploads.find((upload) => upload.id === activeUploadId) ?? uploads[0] ?? null;
  const activeResult = activeUpload?.result?.success ? activeUpload.result : null;
  const activeItemError =
    activeUpload?.result && !activeUpload.result.success
      ? activeUpload.result.error?.message ?? "This file could not be processed."
      : "";

  const deferredTranscript = useDeferredValue(activeResult?.ocr?.text ?? "");
  const isBusy = isSubmitting || isPending || isPreparingSample;
  const previewUrl = activeUpload?.previewUrl ?? "";
  const scannedPreview = activeResult?.images?.scan_png_base64
    ? toDataUrl(activeResult.images.scan_png_base64)
    : "";
  const confidenceValue = activeResult?.ocr?.mean_confidence ?? 0;
  const stages = buildStageCards(activeResult);
  const successCount = uploads.filter((upload) => upload.result?.success).length;
  const failureCount = uploads.filter(
    (upload) => upload.result !== null && !upload.result.success,
  ).length;

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      revokeUploadUrls(uploadsRef.current);
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter(isImageFile);
    replaceUploads(files, "local");
  };

  const handleScan = async () => {
    const currentUploads = uploadsRef.current;

    if (currentUploads.length === 0) {
      setError("Choose one or more document photos before launching the scan.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setCopied(false);

    const formData = new FormData();
    formData.append("debug", String(debugEnabled));
    formData.append("ocr_langs", ocrLanguages);
    formData.append("scan_mode", scanMode);

    const endpoint =
      currentUploads.length > 1 ? `${API_BASE_URL}/api/v1/scan/batch` : `${API_BASE_URL}/api/v1/scan`;

    if (currentUploads.length > 1) {
      currentUploads.forEach((upload) => {
        formData.append("files", upload.file);
      });
    } else if (currentUploads[0]) {
      formData.append("file", currentUploads[0].file);
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorResponse;
        throw new Error(payload.detail?.message ?? "The scan pipeline could not process this image.");
      }

      if (currentUploads.length > 1) {
        const payload = (await response.json()) as BatchScanResponse;
        const nextUploads = currentUploads.map((upload, index) => ({
          ...upload,
          result:
            payload.items[index] ??
            buildMissingBatchResult(upload.file.name),
        }));
        const preferredIndex = nextUploads.findIndex((upload) => !upload.result?.success);
        const nextActiveIndex = preferredIndex >= 0 ? preferredIndex : 0;

        startTransition(() => {
          setUploads(nextUploads);
          setActiveUploadId(nextUploads[nextActiveIndex]?.id ?? null);
        });

        if (!payload.success) {
          setError("Some files could not be processed. Review the batch queue for details.");
        }
      } else {
        const payload = (await response.json()) as ScanResponse;
        const nextUploads = currentUploads.map((upload, index) => ({
          ...upload,
          result: index === 0 ? toBatchScanItem(payload) : upload.result,
        }));

        startTransition(() => {
          setUploads(nextUploads);
          setActiveUploadId(nextUploads[0]?.id ?? null);
        });
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while talking to the backend.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!activeResult?.ocr?.text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeResult.ocr.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access failed. You can still copy the text manually.");
    }
  };

  const handleDownload = () => {
    if (!activeResult?.images?.scan_png_base64 || !activeUpload) {
      return;
    }

    const filename = activeUpload.file.name.replace(/\.[^.]+$/, "") || "clearsheet";
    downloadDataUrl(toDataUrl(activeResult.images.scan_png_base64), `${filename}-scan.png`);
  };

  const handleDownloadPdf = async () => {
    if (!activeResult?.images?.scan_png_base64 || !activeUpload) {
      return;
    }

    const filename = activeUpload.file.name.replace(/\.[^.]+$/, "") || "clearsheet";

    try {
      await downloadDataUrlAsPdf(
        toDataUrl(activeResult.images.scan_png_base64),
        `${filename}-scan.pdf`,
        activeResult.ocr?.tokens ?? [],
      );
    } catch (pdfError) {
      const message =
        pdfError instanceof Error
          ? pdfError.message
          : "The scan could not be exported as a PDF.";
      setError(message);
    }
  };

  const handleSelectUpload = (uploadId: string) => {
    setActiveUploadId(uploadId);
    setCopied(false);
  };

  const handleClearUploads = () => {
    revokeUploadUrls(uploadsRef.current);
    uploadsRef.current = [];
    setUploads([]);
    setActiveUploadId(null);
    setError("");
    setCopied(false);
  };

  const handleLoadSample = async (sampleId: string) => {
    setIsPreparingSample(true);
    setError("");

    try {
      const sampleFile = await buildDemoSampleFile(sampleId);
      replaceUploads([sampleFile], "sample");
    } catch (sampleError) {
      setError(
        sampleError instanceof Error
          ? sampleError.message
          : "The demo sample could not be generated.",
      );
    } finally {
      setIsPreparingSample(false);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);

    const files = Array.from(event.dataTransfer.files ?? []).filter(isImageFile);
    if (files.length === 0) {
      setError("Drop one or more PNG or JPG files to build a scan batch.");
      return;
    }

    replaceUploads(files, "local");
  };

  function replaceUploads(files: File[], source: UploadSource) {
    revokeUploadUrls(uploadsRef.current);

    const nextUploads = files.map((file, index) => createWorkbenchUpload(file, source, index));
    uploadsRef.current = nextUploads;

    setUploads(nextUploads);
    setActiveUploadId(nextUploads[0]?.id ?? null);
    setError("");
    setCopied(false);
  }

  return {
    activeItemError,
    activeUploadId,
    confidenceValue,
    copied,
    debugEnabled,
    deferredTranscript,
    error,
    failureCount,
    handleClearUploads,
    handleCopyTranscript,
    handleDownload,
    handleDownloadPdf,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileChange,
    handleLoadSample,
    handleOcrLanguagesChange: setOcrLanguages,
    handleScan,
    handleScanModeChange: setScanMode,
    handleSelectUpload,
    handleToggleDebug: setDebugEnabled,
    isBatch: uploads.length > 1,
    isBusy,
    isDragActive,
    ocrLanguages,
    previewUrl,
    result: activeResult,
    scanMode,
    scannedPreview,
    stages,
    successCount,
    uploads,
  };
}

function createWorkbenchUpload(
  file: File,
  source: UploadSource,
  index: number,
): WorkbenchUpload {
  return {
    file,
    id: `${Date.now()}-${index}-${file.name}-${file.size}`,
    previewUrl: URL.createObjectURL(file),
    result: null,
    source,
  };
}

function revokeUploadUrls(uploads: WorkbenchUpload[]) {
  uploads.forEach((upload) => {
    URL.revokeObjectURL(upload.previewUrl);
  });
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function toBatchScanItem(payload: ScanResponse): BatchScanItem {
  return {
    filename: payload.metadata.filename,
    success: payload.success,
    metadata: payload.metadata,
    images: payload.images,
    ocr: payload.ocr,
  };
}

function buildMissingBatchResult(filename: string): BatchScanItem {
  return {
    filename,
    success: false,
    error: {
      code: "missing_result",
      message: "The backend did not return a result for this file.",
    },
  };
}
