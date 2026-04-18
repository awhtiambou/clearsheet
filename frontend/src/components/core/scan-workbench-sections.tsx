import type { ChangeEvent, DragEvent } from "react";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiDownload,
  FiFileText,
  FiImage,
  FiLayers,
  FiLoader,
  FiMove,
  FiPlayCircle,
  FiSearch,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import { formatBytes, toDataUrl } from "@/src/config";
import type { BatchScanItem, ScanMode } from "@/src/types";

import {
  heroChips,
  heroHighlights,
  inputFeatureCards,
  labelChipStyle,
  ocrLanguageOptions,
  scanModeOptions,
  type StageCard,
  workflowDetails,
  workflowPreviewIcon,
  workflowSteps,
} from "./scan-workbench.data";
import { demoSamples } from "./scan-workbench.samples";
import type { WorkbenchUpload } from "./use-scan-workbench";

type UploadPanelProps = {
  activeUploadId: string | null;
  debugEnabled: boolean;
  error: string;
  failureCount: number;
  isBatch: boolean;
  isBusy: boolean;
  isDragActive: boolean;
  onClearUploads: () => void;
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSample: (sampleId: string) => void;
  onOcrLanguagesChange: (value: string) => void;
  onScan: () => void;
  onScanModeChange: (value: ScanMode) => void;
  onSelectUpload: (uploadId: string) => void;
  onToggleDebug: (enabled: boolean) => void;
  ocrLanguages: string;
  scanMode: ScanMode;
  successCount: number;
  uploads: WorkbenchUpload[];
};

type ReviewBoardProps = {
  activeItemError: string;
  activeUploadId: string | null;
  confidenceValue: number;
  copied: boolean;
  onCopyTranscript: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  onSelectUpload: (uploadId: string) => void;
  previewUrl: string;
  result: BatchScanItem | null;
  scannedPreview: string;
  transcript: string;
  uploads: WorkbenchUpload[];
};

type PipelineSnapshotsProps = {
  hasResult: boolean;
  isDebugEnabled: boolean;
  stages: StageCard[];
};

type ImageCardProps = {
  compact?: boolean;
  emptyNote: string;
  emptyTitle: string;
  eyebrow: string;
  image: string;
  title: string;
};

export function ScanWorkbenchHero() {
  const PreviewIcon = workflowPreviewIcon;

  return (
    <Paper className="paper-panel overflow-hidden rounded-[30px] p-6 sm:p-8" elevation={0}>
      <div className="grid gap-8 lg:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-5">
          <Stack direction="row" spacing={1.2} className="flex-wrap">
            {heroChips.map(({ icon: ChipIcon, label }) => (
              <Chip
                key={label}
                icon={<ChipIcon />}
                label={label}
                variant="outlined"
                sx={labelChipStyle}
              />
            ))}
          </Stack>

          <div className="space-y-4">
            <Typography className="font-mono text-[0.76rem] uppercase tracking-[0.28em] text-[var(--color-accent)]">
              Crafted scan workspace
            </Typography>
            <Typography
              component="h1"
              className="max-w-3xl font-serif text-5xl leading-[1.02] text-[var(--color-ink)] sm:text-6xl"
            >
              Turn a noisy phone photo or a whole batch into crisp, searchable sheets.
            </Typography>
            <Typography className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              ClearSheet detects the page, straightens perspective, auto-corrects small
              post-warp tilt, renders scan profiles, and exports OCR-backed PDFs from a
              single review surface.
            </Typography>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {heroHighlights.map((item, index) => (
              <motion.div
                key={item.label}
                className="rounded-[24px] border border-white/50 bg-white/55 p-4"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.45 }}
              >
                <Typography className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </Typography>
                <Typography className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
                  {item.value}
                </Typography>
                <Typography className="mt-2 text-sm leading-6 text-slate-600">
                  {item.note}
                </Typography>
              </motion.div>
            ))}
          </div>
        </div>

        <Paper
          elevation={0}
          className="image-stage relative overflow-hidden rounded-[30px] border border-white/70 p-5 sm:p-6"
        >
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent" />
          <div className="relative flex h-full flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                  Workflow board
                </Typography>
                <Typography className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Live frontend preview
                </Typography>
              </div>
              <div className="rounded-full border border-white/80 bg-white/70 p-3 text-[var(--color-accent)]">
                <PreviewIcon size={20} />
              </div>
            </div>

            <div className="grid gap-3">
              {workflowSteps.map((step) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3"
                >
                  <FiCheckCircle className="shrink-0 text-[var(--color-accent)]" />
                  <Typography className="text-sm leading-6 text-slate-700">{step}</Typography>
                </div>
              ))}
            </div>

            <div className="dotted-divider h-px w-full opacity-70" />

            <div className="grid grid-cols-2 gap-3">
              {workflowDetails.map((detail) => (
                <div
                  key={detail.label}
                  className="rounded-2xl border border-white/70 bg-white/70 p-4"
                >
                  <Typography className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-slate-500">
                    {detail.label}
                  </Typography>
                  <Typography className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {detail.value}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        </Paper>
      </div>
    </Paper>
  );
}

export function ScanWorkbenchUploadPanel({
  activeUploadId,
  debugEnabled,
  error,
  failureCount,
  isBatch,
  isBusy,
  isDragActive,
  onClearUploads,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onLoadSample,
  onOcrLanguagesChange,
  onScan,
  onScanModeChange,
  onSelectUpload,
  onToggleDebug,
  ocrLanguages,
  scanMode,
  successCount,
  uploads,
}: UploadPanelProps) {
  return (
    <Paper className="paper-panel rounded-[30px] p-6" elevation={0}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              Input
            </Typography>
            <Typography className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              Build a queue, tune the pipeline, then launch the scan run
            </Typography>
          </div>
          <div className="rounded-full border border-[rgba(93,173,226,0.2)] bg-[rgba(93,173,226,0.1)] p-3 text-[var(--color-accent)]">
            <FiUploadCloud size={22} />
          </div>
        </div>

        <Paper
          elevation={0}
          className={`rounded-[26px] border border-dashed p-5 transition-all sm:p-6 ${
            isDragActive
              ? "border-[rgba(93,173,226,0.8)] bg-[rgba(93,173,226,0.14)]"
              : "border-[rgba(93,173,226,0.45)] bg-[rgba(93,173,226,0.08)]"
          }`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70 text-[var(--color-accent)]">
                <FiMove size={22} />
              </div>
              <div>
                <Typography className="text-base font-semibold text-[var(--color-ink)]">
                  Drag and drop one or more document photos here
                </Typography>
                <Typography className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                  Use real phone captures for the full demo, or load one of the sample
                  scenes below to explore the pipeline instantly.
                </Typography>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                component="label"
                variant="contained"
                color="primary"
                startIcon={<FiUploadCloud />}
              >
                Choose images
                <input
                  hidden
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  type="file"
                  onChange={onFileChange}
                />
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={isBusy ? <FiLoader className="animate-spin" /> : <FiSearch />}
                onClick={onScan}
                disabled={uploads.length === 0 || isBusy}
              >
                {isBusy
                  ? "Processing..."
                  : isBatch
                    ? `Run batch scan (${uploads.length})`
                    : "Run scan pipeline"}
              </Button>

              <Button
                variant="text"
                color="secondary"
                startIcon={<FiX />}
                onClick={onClearUploads}
                disabled={uploads.length === 0 || isBusy}
              >
                Clear queue
              </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <FormControl fullWidth size="small">
                <InputLabel id="ocr-language-label">OCR Profile</InputLabel>
                <Select
                  labelId="ocr-language-label"
                  value={ocrLanguages}
                  label="OCR Profile"
                  onChange={(event) => onOcrLanguagesChange(event.target.value)}
                >
                  {ocrLanguageOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="scan-mode-label">Scan Mode</InputLabel>
                <Select
                  labelId="scan-mode-label"
                  value={scanMode}
                  label="Scan Mode"
                  onChange={(event) => onScanModeChange(event.target.value as ScanMode)}
                >
                  {scanModeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.96fr]">
              <div className="rounded-[22px] border border-white/80 bg-white/80 p-4">
                <Typography className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-slate-500">
                  Active mode
                </Typography>
                <Typography className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                  {scanModeOptions.find((option) => option.value === scanMode)?.label}
                </Typography>
                <Typography className="mt-2 text-sm leading-7 text-slate-600">
                  {scanModeOptions.find((option) => option.value === scanMode)?.note}
                </Typography>
              </div>

              <div className="flex items-center rounded-[22px] border border-white/80 bg-white/80 px-4 py-3">
                <FormControlLabel
                  className="m-0"
                  control={
                    <Switch
                      color="primary"
                      checked={debugEnabled}
                      onChange={(_, checked) => onToggleDebug(checked)}
                    />
                  }
                  label="Keep debug snapshots"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {demoSamples.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="rounded-[22px] border border-white/80 bg-white/78 p-4 text-left transition hover:border-[rgba(93,173,226,0.45)] hover:bg-white"
                  onClick={() => onLoadSample(sample.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Typography className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-slate-500">
                        Demo sample
                      </Typography>
                      <Typography className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                        {sample.label}
                      </Typography>
                    </div>
                    <div className="rounded-full bg-[rgba(93,173,226,0.12)] p-2 text-[var(--color-accent)]">
                      <FiPlayCircle />
                    </div>
                  </div>
                  <Typography className="mt-3 text-sm leading-7 text-slate-600">
                    {sample.note}
                  </Typography>
                </button>
              ))}
            </div>

            {uploads.length > 0 ? (
              <div className="rounded-[22px] border border-white/80 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Typography className="text-sm font-semibold text-[var(--color-ink)]">
                      {uploads.length} file{uploads.length > 1 ? "s" : ""} in queue
                    </Typography>
                    <Typography className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-slate-500">
                      {successCount} done - {failureCount} issues - {uploads.length - successCount - failureCount} waiting
                    </Typography>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip label={isBatch ? "Batch mode" : "Single file"} sx={labelChipStyle} />
                    <Chip label={`${scanMode} scan`} sx={labelChipStyle} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {uploads.map((upload) => (
                    <button
                      key={upload.id}
                      type="button"
                      className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                        upload.id === activeUploadId
                          ? "border-[rgba(93,173,226,0.6)] bg-[rgba(93,173,226,0.13)] text-[var(--color-ink)]"
                          : "border-white/80 bg-white text-slate-600"
                      }`}
                      onClick={() => onSelectUpload(upload.id)}
                    >
                      {upload.file.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isBusy ? <LinearProgress color="primary" /> : null}
            {error ? <Alert severity="warning">{error}</Alert> : null}
          </div>
        </Paper>

        <div className="grid gap-4 sm:grid-cols-3">
          {inputFeatureCards.map((card) => {
            const CardIcon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-[24px] border border-[rgba(189,195,199,0.34)] bg-white/65 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(93,173,226,0.12)] text-[var(--color-accent)]">
                  <CardIcon />
                </div>
                <Typography className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.15em] text-slate-500">
                  {card.label}
                </Typography>
                <Typography className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  {card.value}
                </Typography>
                <Typography className="mt-2 text-sm leading-6 text-slate-600">
                  {card.note}
                </Typography>
              </div>
            );
          })}
        </div>
      </div>
    </Paper>
  );
}

export function ScanWorkbenchReviewBoard({
  activeItemError,
  activeUploadId,
  confidenceValue,
  copied,
  onCopyTranscript,
  onDownloadPdf,
  onDownloadPng,
  onSelectUpload,
  previewUrl,
  result,
  scannedPreview,
  transcript,
  uploads,
}: ReviewBoardProps) {
  return (
    <Paper className="paper-panel rounded-[30px] p-6" elevation={0}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              Review board
            </Typography>
            <Typography className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              Compare the source and the corrected sheet
            </Typography>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outlined"
              color="primary"
              startIcon={copied ? <FiCheckCircle /> : <FiCopy />}
              onClick={onCopyTranscript}
              disabled={!result?.ocr?.text}
            >
              {copied ? "Copied" : "Copy text"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FiDownload />}
              onClick={onDownloadPng}
              disabled={!result?.images?.scan_png_base64}
            >
              Download PNG
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FiFileText />}
              onClick={onDownloadPdf}
              disabled={!result?.images?.scan_png_base64}
            >
              Searchable PDF
            </Button>
          </div>
        </div>

        {uploads.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {uploads.map((upload) => (
              <button
                key={upload.id}
                type="button"
                className={`rounded-[22px] border p-4 text-left transition ${
                  upload.id === activeUploadId
                    ? "border-[rgba(93,173,226,0.55)] bg-[rgba(93,173,226,0.1)]"
                    : "border-[rgba(189,195,199,0.34)] bg-white/66"
                }`}
                onClick={() => onSelectUpload(upload.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <Typography className="text-sm font-semibold text-[var(--color-ink)]">
                    {upload.file.name}
                  </Typography>
                  <StatusChip upload={upload} />
                </div>
                <Typography className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                  {upload.source} - {formatBytes(upload.file.size)}
                </Typography>
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <ImageCard
            title="Original photo"
            eyebrow="Source frame"
            image={previewUrl}
            emptyTitle="Your original image will appear here."
            emptyNote="Choose images, drop a batch, or load a sample scene to feed the pipeline."
          />
          <ImageCard
            title="Scanned output"
            eyebrow="Clean result"
            image={scannedPreview}
            emptyTitle="The scanned document will appear here."
            emptyNote="Once processed, this panel shows the flattened, high-contrast page."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Paper
            elevation={0}
            className="rounded-[26px] border border-[rgba(189,195,199,0.34)] bg-white/70 p-5"
          >
            <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              OCR confidence
            </Typography>
            <Typography className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
              {result ? `${confidenceValue.toFixed(1)}%` : "--"}
            </Typography>
            <Typography className="mt-2 text-sm leading-7 text-slate-600">
              Confidence is pulled directly from Tesseract and helps you judge whether
              the document needs a better source photo or a different scan profile.
            </Typography>
            <LinearProgress
              className="mt-5"
              variant="determinate"
              value={Math.max(0, Math.min(100, confidenceValue))}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip label={`OCR: ${result?.ocr?.languages ?? "fra+eng"}`} sx={labelChipStyle} />
              <Chip
                label={
                  result?.metadata
                    ? `${result.metadata.output_width} x ${result.metadata.output_height}`
                    : "Awaiting scan"
                }
                sx={labelChipStyle}
              />
              <Chip
                label={result?.metadata?.scan_mode ?? "balanced"}
                sx={labelChipStyle}
              />
              <Chip
                label={
                  result?.metadata
                    ? `Rotate ${result.metadata.rotation_correction_degrees.toFixed(2)}°`
                    : "Rotation pending"
                }
                sx={labelChipStyle}
              />
            </div>
          </Paper>

          <Paper
            elevation={0}
            className="transcript-grid rounded-[26px] border border-[rgba(189,195,199,0.34)] bg-white/72 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                  Extracted transcript
                </Typography>
                <Typography className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  OCR text surface
                </Typography>
              </div>
              <FiFileText className="mt-1 text-[var(--color-accent)]" size={22} />
            </div>
            <Divider className="my-4" />

            {activeItemError ? <Alert severity="error">{activeItemError}</Alert> : null}

            <Typography
              component="pre"
              className="min-h-[220px] whitespace-pre-wrap break-words font-mono text-[0.94rem] leading-8 text-slate-700"
            >
              {transcript || "The extracted text will appear here once the backend finishes OCR."}
            </Typography>
          </Paper>
        </div>
      </div>
    </Paper>
  );
}

export function ScanWorkbenchSnapshots({
  hasResult,
  isDebugEnabled,
  stages,
}: PipelineSnapshotsProps) {
  return (
    <Paper className="paper-panel rounded-[30px] p-6" elevation={0}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Pipeline snapshots
          </Typography>
          <Typography className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
            Read the transformation, not just the final image
          </Typography>
        </div>
        <Chip
          label={
            !isDebugEnabled
              ? "Debug disabled"
              : hasResult
                ? "Debug ready"
                : "Waiting for result"
          }
          variant="outlined"
          sx={labelChipStyle}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {stages.map((stage, index) => (
          <motion.div
            key={stage.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.4 }}
          >
            <ImageCard
              title={stage.label}
              eyebrow="Debug step"
              image={stage.image ? toDataUrl(stage.image) : ""}
              emptyTitle={`${stage.label} preview pending.`}
              emptyNote={stage.description}
              compact
            />
          </motion.div>
        ))}
      </div>
    </Paper>
  );
}

function StatusChip({ upload }: { upload: WorkbenchUpload }) {
  if (!upload.result) {
    return (
      <Chip
        label="Queued"
        icon={<FiClock />}
        sx={{ ...labelChipStyle, bgcolor: "rgba(255,255,255,0.78)" }}
      />
    );
  }

  if (upload.result.success) {
    return (
      <Chip
        label="Done"
        icon={<FiCheckCircle />}
        sx={{
          ...labelChipStyle,
          bgcolor: "rgba(93, 173, 226, 0.14)",
          borderColor: "rgba(93, 173, 226, 0.35)",
        }}
      />
    );
  }

  return (
    <Chip
      label="Issue"
      icon={<FiLayers />}
      sx={{
        ...labelChipStyle,
        bgcolor: "rgba(244, 67, 54, 0.1)",
        borderColor: "rgba(244, 67, 54, 0.2)",
      }}
    />
  );
}

function ImageCard({
  compact = false,
  emptyNote,
  emptyTitle,
  eyebrow,
  image,
  title,
}: ImageCardProps) {
  return (
    <Paper
      elevation={0}
      className={`image-stage overflow-hidden rounded-[26px] border border-[rgba(189,195,199,0.34)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <Typography className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
        {eyebrow}
      </Typography>
      <Typography className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
        {title}
      </Typography>

      <div
        className={`mt-4 overflow-hidden rounded-[22px] border border-white/90 bg-white/80 ${
          compact ? "min-h-[180px]" : "min-h-[290px]"
        }`}
      >
        {image ? (
          <Image
            src={image}
            alt={title}
            unoptimized
            width={1600}
            height={1200}
            className={`h-full w-full object-contain ${
              compact ? "max-h-[240px]" : "max-h-[420px]"
            }`}
          />
        ) : (
          <div
            className={`flex h-full flex-col items-center justify-center px-6 py-10 text-center ${
              compact ? "min-h-[180px]" : "min-h-[290px]"
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(93,173,226,0.12)] text-[var(--color-accent)]">
              <FiImage size={22} />
            </div>
            <Typography className="mt-4 text-base font-semibold text-[var(--color-ink)]">
              {emptyTitle}
            </Typography>
            <Typography className="mt-2 max-w-sm text-sm leading-7 text-slate-600">
              {emptyNote}
            </Typography>
          </div>
        )}
      </div>
    </Paper>
  );
}
