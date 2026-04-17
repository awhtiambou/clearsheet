import type { ChangeEvent } from "react";

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
  FiCopy,
  FiDownload,
  FiFileText,
  FiImage,
  FiLoader,
  FiSearch,
  FiUploadCloud,
} from "react-icons/fi";

import { formatBytes, toDataUrl } from "@/src/config";
import type { ScanResponse } from "@/src/types";

import {
  heroChips,
  heroHighlights,
  inputFeatureCards,
  labelChipStyle,
  ocrLanguageOptions,
  type StageCard,
  workflowDetails,
  workflowPreviewIcon,
  workflowSteps,
} from "./scan-workbench.data";

type UploadPanelProps = {
  debugEnabled: boolean;
  error: string;
  isBusy: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOcrLanguagesChange: (value: string) => void;
  onScan: () => void;
  onToggleDebug: (enabled: boolean) => void;
  ocrLanguages: string;
  selectedFile: File | null;
};

type ReviewBoardProps = {
  confidenceValue: number;
  copied: boolean;
  onCopyTranscript: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  previewUrl: string;
  result: ScanResponse | null;
  scannedPreview: string;
  transcript: string;
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
              Turn a noisy phone photo into a calm, crisp digital sheet.
            </Typography>
            <Typography className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              ClearSheet straightens perspective, isolates the page, amplifies contrast,
              and reveals OCR text in a single review surface built for demos,
              debugging, and iteration.
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
                  <Typography className="text-sm leading-6 text-slate-700">
                    {step}
                  </Typography>
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
  debugEnabled,
  error,
  isBusy,
  onFileChange,
  onOcrLanguagesChange,
  onScan,
  onToggleDebug,
  ocrLanguages,
  selectedFile,
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
              Upload a source photo
            </Typography>
          </div>
          <div className="rounded-full border border-[rgba(93,173,226,0.2)] bg-[rgba(93,173,226,0.1)] p-3 text-[var(--color-accent)]">
            <FiUploadCloud size={22} />
          </div>
        </div>

        <Paper
          elevation={0}
          className="rounded-[26px] border border-dashed border-[rgba(93,173,226,0.45)] bg-[rgba(93,173,226,0.08)] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4">
            <Typography className="max-w-md text-sm leading-7 text-slate-600">
              Use a real document photo for the strongest demo. The backend expects a
              dominant page contour and will reveal each transformation stage.
            </Typography>

            <div className="flex flex-wrap gap-3">
              <Button
                component="label"
                variant="contained"
                color="primary"
                startIcon={<FiUploadCloud />}
              >
                Choose image
                <input
                  hidden
                  accept="image/png,image/jpeg,image/jpg"
                  type="file"
                  onChange={onFileChange}
                />
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={isBusy ? <FiLoader className="animate-spin" /> : <FiSearch />}
                onClick={onScan}
                disabled={!selectedFile || isBusy}
              >
                {isBusy ? "Processing..." : "Run scan pipeline"}
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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

              <div className="flex items-center rounded-[20px] border border-white/70 bg-white/75 px-4 py-2">
                <FormControlLabel
                  className="m-0"
                  control={
                    <Switch
                      color="primary"
                      checked={debugEnabled}
                      onChange={(_, checked) => onToggleDebug(checked)}
                    />
                  }
                  label="Debug snapshots"
                />
              </div>
            </div>

            {selectedFile ? (
              <div className="rounded-[22px] border border-white/80 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Typography className="text-sm font-semibold text-[var(--color-ink)]">
                      {selectedFile.name}
                    </Typography>
                    <Typography className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-slate-500">
                      {selectedFile.type || "unknown"} - {formatBytes(selectedFile.size)}
                    </Typography>
                  </div>
                  <Chip
                    label="Ready"
                    color="primary"
                    sx={{ bgcolor: "rgba(93, 173, 226, 0.16)", color: "#2C3E50" }}
                  />
                </div>
              </div>
            ) : null}

            {isBusy ? <LinearProgress color="primary" /> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
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
  confidenceValue,
  copied,
  onCopyTranscript,
  onDownloadPdf,
  onDownloadPng,
  previewUrl,
  result,
  scannedPreview,
  transcript,
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
              disabled={!result?.ocr.text}
            >
              {copied ? "Copied" : "Copy text"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FiDownload />}
              onClick={onDownloadPng}
              disabled={!result?.images.scan_png_base64}
            >
              Download PNG
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FiFileText />}
              onClick={onDownloadPdf}
              disabled={!result?.images.scan_png_base64}
            >
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ImageCard
            title="Original photo"
            eyebrow="Source frame"
            image={previewUrl}
            emptyTitle="Your original image will appear here."
            emptyNote="Pick a document photo to feed the pipeline."
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
              the document needs a better source photo.
            </Typography>
            <LinearProgress
              className="mt-5"
              variant="determinate"
              value={Math.max(0, Math.min(100, confidenceValue))}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip label={`OCR: ${result?.ocr.languages ?? "fra+eng"}`} sx={labelChipStyle} />
              <Chip
                label={
                  result
                    ? `${result.metadata.output_width} x ${result.metadata.output_height}`
                    : "Awaiting scan"
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
            className={`h-full w-full object-cover ${
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
