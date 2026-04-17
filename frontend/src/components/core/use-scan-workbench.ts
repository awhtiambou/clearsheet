"use client";

import { type ChangeEvent, useDeferredValue, useEffect, useState, useTransition } from "react";

import { API_BASE_URL, toDataUrl } from "@/src/config";
import type { ApiErrorResponse, ScanResponse } from "@/src/types";

import { buildStageCards } from "./scan-workbench.data";

const DEFAULT_OCR_LANGS = "fra+eng";

export function useScanWorkbench() {
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
    formData.append("debug", "true");
    formData.append("ocr_langs", DEFAULT_OCR_LANGS);

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

    const anchor = document.createElement("a");
    const filename = selectedFile?.name.replace(/\.[^.]+$/, "") || "clearsheet";
    anchor.href = toDataUrl(result.images.scan_png_base64);
    anchor.download = `${filename}-scan.png`;
    anchor.click();
  };

  return {
    confidenceValue,
    copied,
    deferredTranscript,
    error,
    handleCopyTranscript,
    handleDownload,
    handleFileChange,
    handleScan,
    isBusy,
    previewUrl,
    result,
    scannedPreview,
    selectedFile,
    stages,
  };
}
