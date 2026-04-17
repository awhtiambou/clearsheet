"use client";

import { motion } from "framer-motion";

import {
  ScanWorkbenchHero,
  ScanWorkbenchReviewBoard,
  ScanWorkbenchSnapshots,
  ScanWorkbenchUploadPanel,
} from "./scan-workbench-sections";
import { useScanWorkbench } from "./use-scan-workbench";

export function ScanWorkbench() {
  const workbench = useScanWorkbench();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:gap-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <ScanWorkbenchHero />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
        >
          <ScanWorkbenchUploadPanel
            selectedFile={workbench.selectedFile}
            isBusy={workbench.isBusy}
            error={workbench.error}
            debugEnabled={workbench.debugEnabled}
            ocrLanguages={workbench.ocrLanguages}
            onFileChange={workbench.handleFileChange}
            onOcrLanguagesChange={workbench.handleOcrLanguagesChange}
            onScan={workbench.handleScan}
            onToggleDebug={workbench.handleToggleDebug}
          />
        </motion.div>

        <div className="grid gap-6">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55 }}
          >
            <ScanWorkbenchReviewBoard
              previewUrl={workbench.previewUrl}
              scannedPreview={workbench.scannedPreview}
              result={workbench.result}
              copied={workbench.copied}
              confidenceValue={workbench.confidenceValue}
              transcript={workbench.deferredTranscript}
              onCopyTranscript={workbench.handleCopyTranscript}
              onDownloadPdf={workbench.handleDownloadPdf}
              onDownloadPng={workbench.handleDownload}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.55 }}
          >
            <ScanWorkbenchSnapshots
              stages={workbench.stages}
              hasResult={Boolean(workbench.result)}
              isDebugEnabled={workbench.debugEnabled}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
