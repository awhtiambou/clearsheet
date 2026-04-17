"use client";

import { type ChangeEvent, useDeferredValue, useEffect, useState, useTransition } from "react";

import { API_BASE_URL, toDataUrl } from "@/src/config";
import type { ApiErrorResponse, ScanResponse } from "@/src/types";

import { buildStageCards } from "./scan-workbench.data";
import { downloadDataUrl, downloadDataUrlAsPdf } from "./scan-export";

const DEFAULT_OCR_LANGS = "fra+eng";

export function useScanWorkbench() {
  const [debugEnabled, setDebugEnabled] = useState(true);
  const [ocrLanguages, setOcrLanguages] = useState(DEFAULT_OCR_LANGS);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deferredTranscript = useDeferredValue(result?.ocr.text ?? "");
  const isBusy = isSubmitting || isPending;
  const scannedPreview = result?.images.scan_png_base64
    ? toDataUrl(result.images.scan_png_base64)
    : "";
  const confidenceValue = result?.ocr.mean_confidence ?? 0;
  const stages = buildStageCards(result);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setResult(null);
    setError("");
    setCopied(false);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError("Choose a document photo before launching the scan.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("debug", String(debugEnabled));
    formData.append("ocr_langs", ocrLanguages);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorResponse;
        throw new Error(payload.detail?.message ?? "The scan pipeline could not process this image.");
      }

      const payload = (await response.json()) as ScanResponse;
      startTransition(() => {
        setResult(payload);
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while talking to the backend.";
      setResult(null);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!result?.ocr.text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.ocr.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access failed. You can still copy the text manually.");
    }
  };

  const handleDownload = () => {
    if (!result?.images.scan_png_base64) {
      return;
    }

    const filename = selectedFile?.name.replace(/\.[^.]+$/, "") || "clearsheet";
    downloadDataUrl(toDataUrl(result.images.scan_png_base64), `${filename}-scan.png`);
  };

  const handleDownloadPdf = async () => {
    if (!result?.images.scan_png_base64) {
      return;
    }

    const filename = selectedFile?.name.replace(/\.[^.]+$/, "") || "clearsheet";

    try {
      await downloadDataUrlAsPdf(
        toDataUrl(result.images.scan_png_base64),
        `${filename}-scan.pdf`,
      );
    } catch (pdfError) {
      const message =
        pdfError instanceof Error
          ? pdfError.message
          : "The scan could not be exported as a PDF.";
      setError(message);
    }
  };

  return {
    confidenceValue,
    copied,
    deferredTranscript,
    debugEnabled,
    error,
    handleCopyTranscript,
    handleDownload,
    handleDownloadPdf,
    handleFileChange,
    handleOcrLanguagesChange: setOcrLanguages,
    handleScan,
    handleToggleDebug: setDebugEnabled,
    isBusy,
    ocrLanguages,
    previewUrl,
    result,
    scannedPreview,
    selectedFile,
    stages,
  };
}
