"use client";

import type { OcrToken } from "@/src/types";

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 28;

type PdfImagePayload = {
  height: number;
  jpegBytes: Uint8Array;
  tokens: OcrToken[];
  width: number;
};

export function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export async function downloadDataUrlAsPdf(
  dataUrl: string,
  filename: string,
  tokens: OcrToken[] = [],
) {
  const pdfImage = await buildPdfImagePayload(dataUrl, tokens);
  const pdfBytes = buildPdfDocument(pdfImage);
  const pdfBlob = new Blob([pdfBytes.slice()], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(pdfBlob);

  try {
    downloadDataUrl(objectUrl, filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

async function buildPdfImagePayload(
  dataUrl: string,
  tokens: OcrToken[],
): Promise<PdfImagePayload> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("PDF export is unavailable because the canvas context could not be created.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const jpegBytes = decodeBase64DataUrl(jpegDataUrl);

  return {
    height: canvas.height,
    jpegBytes,
    tokens,
    width: canvas.width,
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The scan image could not be prepared for PDF export."));
    image.src = dataUrl;
  });
}

function decodeBase64DataUrl(dataUrl: string): Uint8Array {
  const [, base64Payload] = dataUrl.split(",", 2);
  if (!base64Payload) {
    throw new Error("The generated image payload is invalid.");
  }

  const binaryString = window.atob(base64Payload);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

function buildPdfDocument({ height, jpegBytes, tokens, width }: PdfImagePayload): Uint8Array {
  const encoder = new TextEncoder();
  const header = encodeText("%PDF-1.4\n", encoder);
  const isLandscape = width > height;
  const pageWidth = isLandscape ? PDF_PAGE_HEIGHT : PDF_PAGE_WIDTH;
  const pageHeight = isLandscape ? PDF_PAGE_WIDTH : PDF_PAGE_HEIGHT;
  const scale = Math.min(
    (pageWidth - PDF_MARGIN * 2) / width,
    (pageHeight - PDF_MARGIN * 2) / height,
  );
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const offsetX = (pageWidth - drawWidth) / 2;
  const offsetY = (pageHeight - drawHeight) / 2;
  const contentStream = buildContentStream({
    drawHeight,
    drawWidth,
    offsetX,
    offsetY,
    tokens,
  });

  const objectChunks: Uint8Array[][] = [
    [encodeText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", encoder)],
    [encodeText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n", encoder)],
    [
      encodeText(
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(pageWidth)} ${formatPdfNumber(pageHeight)}] /Resources << /ProcSet [/PDF /Text /ImageC] /Font << /F1 6 0 R >> /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
        encoder,
      ),
    ],
    [
      encodeText(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
        encoder,
      ),
      jpegBytes,
      encodeText("\nendstream\nendobj\n", encoder),
    ],
    [
      encodeText(
        `5 0 obj\n<< /Length ${encoder.encode(contentStream).length} >>\nstream\n${contentStream}endstream\nendobj\n`,
        encoder,
      ),
    ],
    [
      encodeText(
        "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
        encoder,
      ),
    ],
  ];

  let offset = header.length;
  const objectOffsets = [0];

  for (const chunks of objectChunks) {
    objectOffsets.push(offset);
    offset += byteLength(chunks);
  }

  const xrefOffset = offset;
  const xrefBody = objectOffsets
    .map((entryOffset, index) =>
      index === 0
        ? "0000000000 65535 f \n"
        : `${entryOffset.toString().padStart(10, "0")} 00000 n \n`,
    )
    .join("");
  const xref = encodeText(
    `xref\n0 ${objectOffsets.length}\n${xrefBody}trailer\n<< /Size ${objectOffsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    encoder,
  );

  return concatenateUint8Arrays([header, ...objectChunks.flat(), xref]);
}

function buildContentStream({
  drawHeight,
  drawWidth,
  offsetX,
  offsetY,
  tokens,
}: {
  drawHeight: number;
  drawWidth: number;
  offsetX: number;
  offsetY: number;
  tokens: OcrToken[];
}) {
  const drawImageCommands = [
    "q",
    `${formatPdfNumber(drawWidth)} 0 0 ${formatPdfNumber(drawHeight)} ${formatPdfNumber(offsetX)} ${formatPdfNumber(offsetY)} cm`,
    "/Im0 Do",
    "Q",
  ];

  const textLayerCommands = tokens
    .filter((token) => token.text.trim().length > 0)
    .map((token) => buildInvisibleTextCommand(token, drawWidth, drawHeight, offsetX, offsetY));

  return [...drawImageCommands, ...textLayerCommands, ""].join("\n");
}

function buildInvisibleTextCommand(
  token: OcrToken,
  drawWidth: number,
  drawHeight: number,
  offsetX: number,
  offsetY: number,
) {
  const fontSize = Math.max(6, token.height * drawHeight * 0.9);
  const x = offsetX + token.x * drawWidth;
  const y = offsetY + (1 - token.y - token.height) * drawHeight;

  return [
    "BT",
    "3 Tr",
    `/F1 ${formatPdfNumber(fontSize)} Tf`,
    `1 0 0 1 ${formatPdfNumber(x)} ${formatPdfNumber(y)} Tm`,
    `<${encodePdfHexString(token.text)}> Tj`,
    "ET",
  ].join("\n");
}

function encodePdfHexString(value: string) {
  let hex = "";

  for (const character of value) {
    const code = character.codePointAt(0) ?? 63;
    const byte = code <= 255 ? code : 63;
    hex += byte.toString(16).padStart(2, "0").toUpperCase();
  }

  return hex;
}

function formatPdfNumber(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function encodeText(text: string, encoder: TextEncoder) {
  return encoder.encode(text);
}

function byteLength(chunks: Uint8Array[]) {
  return chunks.reduce((total, chunk) => total + chunk.length, 0);
}

function concatenateUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}
