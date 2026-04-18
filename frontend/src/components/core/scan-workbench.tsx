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
            activeUploadId={workbench.activeUploadId}
            failureCount={workbench.failureCount}
            successCount={workbench.successCount}
            uploads={workbench.uploads}
            isBusy={workbench.isBusy}
            isBatch={workbench.isBatch}
            isDragActive={workbench.isDragActive}
            error={workbench.error}
            debugEnabled={workbench.debugEnabled}
            ocrLanguages={workbench.ocrLanguages}
            scanMode={workbench.scanMode}
            onClearUploads={workbench.handleClearUploads}
            onDragEnter={workbench.handleDragEnter}
            onDragLeave={workbench.handleDragLeave}
            onDragOver={workbench.handleDragOver}
            onDrop={workbench.handleDrop}
            onFileChange={workbench.handleFileChange}
            onLoadSample={workbench.handleLoadSample}
            onOcrLanguagesChange={workbench.handleOcrLanguagesChange}
            onScan={workbench.handleScan}
            onScanModeChange={workbench.handleScanModeChange}
            onSelectUpload={workbench.handleSelectUpload}
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
              activeItemError={workbench.activeItemError}
              activeUploadId={workbench.activeUploadId}
              previewUrl={workbench.previewUrl}
              scannedPreview={workbench.scannedPreview}
              result={workbench.result}
              uploads={workbench.uploads}
              copied={workbench.copied}
              confidenceValue={workbench.confidenceValue}
              transcript={workbench.deferredTranscript}
              onCopyTranscript={workbench.handleCopyTranscript}
              onDownloadPdf={workbench.handleDownloadPdf}
              onDownloadPng={workbench.handleDownload}
              onSelectUpload={workbench.handleSelectUpload}
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
