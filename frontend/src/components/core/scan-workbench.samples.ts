"use client";

export type DemoSample = {
  id: string;
  label: string;
  note: string;
  filename: string;
};

const SAMPLE_WIDTH = 1200;
const SAMPLE_HEIGHT = 900;

export const demoSamples: DemoSample[] = [
  {
    id: "printer-test",
    label: "Printer Test",
    note: "High-contrast angled page on a tiled floor.",
    filename: "demo-printer-test.png",
  },
  {
    id: "invoice-shadow",
    label: "Invoice Shadow",
    note: "Softer contrast with a light shadow and presentation layout.",
    filename: "demo-invoice-shadow.png",
  },
];

export async function buildDemoSampleFile(sampleId: string): Promise<File> {
  const sample = demoSamples.find((item) => item.id === sampleId);
  if (!sample) {
    throw new Error("The requested demo sample is unavailable.");
  }

  const svgMarkup = buildSampleSvg(sample.id);
  const pngBlob = await rasterizeSvgToPng(svgMarkup, SAMPLE_WIDTH, SAMPLE_HEIGHT);

  return new File([pngBlob], sample.filename, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

function rasterizeSvgToPng(svgMarkup: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("The browser could not prepare the sample image."));
        return;
      }

      context.fillStyle = "#f2f4f7";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);

        if (!blob) {
          reject(new Error("The sample image could not be generated."));
          return;
        }

        resolve(blob);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The sample image could not be loaded."));
    };

    image.src = objectUrl;
  });
}

function buildSampleSvg(sampleId: string): string {
  if (sampleId === "invoice-shadow") {
    return buildInvoiceShadowSvg();
  }

  return buildPrinterTestSvg();
}

function buildPrinterTestSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SAMPLE_WIDTH}" height="${SAMPLE_HEIGHT}" viewBox="0 0 ${SAMPLE_WIDTH} ${SAMPLE_HEIGHT}">
      <defs>
        <linearGradient id="floorA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d9ddd6" />
          <stop offset="100%" stop-color="#bcc3bc" />
        </linearGradient>
        <filter id="paperShadowA" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#5b6571" flood-opacity="0.23" />
        </filter>
      </defs>

      <rect width="${SAMPLE_WIDTH}" height="${SAMPLE_HEIGHT}" fill="url(#floorA)" />
      <path d="M0 130 L1200 20" stroke="#9da69d" stroke-width="10" opacity="0.55" />
      <path d="M0 520 L1200 430" stroke="#a8b0a8" stroke-width="10" opacity="0.45" />
      <path d="M260 0 L190 900" stroke="#aab1ab" stroke-width="9" opacity="0.35" />
      <path d="M840 0 L780 900" stroke="#a5aca5" stroke-width="9" opacity="0.35" />

      <g transform="translate(255 170) rotate(-7 315 310)" filter="url(#paperShadowA)">
        <rect x="0" y="0" width="630" height="740" fill="#fcfcfb" stroke="#e2e6ea" stroke-width="3" />
        <g fill="#1f2933">
          <rect x="55" y="70" width="70" height="55" rx="4" fill="#111827" opacity="0.92" />
          <text x="170" y="98" font-size="30" font-family="Georgia, serif" font-weight="700">Windows</text>
          <text x="170" y="140" font-size="30" font-family="Georgia, serif" font-weight="700">Printer Test Page</text>

          <text x="55" y="205" font-size="13" font-family="Arial, sans-serif" opacity="0.8">Congratulations!</text>
          <text x="55" y="232" font-size="11" font-family="Arial, sans-serif" opacity="0.68">The information below describes your printer driver and port settings.</text>
          <text x="55" y="258" font-size="11" font-family="Arial, sans-serif" opacity="0.68">Samsung M267x 287x Series installed on workstation OMIZZT.</text>
        </g>

        ${Array.from({ length: 6 }, (_, index) => `
          <text x="55" y="${310 + index * 32}" font-size="11" font-family="'Courier New', monospace" fill="#2c3742" opacity="0.7">
            Driver file ${index + 1}: C:\\Windows\\system32\\spool\\drivers\\w32x86\\3\\ssa6m${index}.dll
          </text>
        `).join("")}

        ${Array.from({ length: 14 }, (_, index) => `
          <line x1="55" y1="${520 + index * 18}" x2="565" y2="${520 + index * 18}" stroke="#98a2ad" stroke-width="1.5" opacity="${index % 2 === 0 ? "0.38" : "0.24"}" />
        `).join("")}

        <text x="55" y="710" font-size="12" font-family="Arial, sans-serif" fill="#233140">This is the end of the printer test page.</text>
      </g>
    </svg>
  `;
}

function buildInvoiceShadowSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SAMPLE_WIDTH}" height="${SAMPLE_HEIGHT}" viewBox="0 0 ${SAMPLE_WIDTH} ${SAMPLE_HEIGHT}">
      <defs>
        <linearGradient id="deskB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ebe7de" />
          <stop offset="100%" stop-color="#cfc8bb" />
        </linearGradient>
        <filter id="paperShadowB" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="10" dy="22" stdDeviation="16" flood-color="#6f6656" flood-opacity="0.22" />
        </filter>
      </defs>

      <rect width="${SAMPLE_WIDTH}" height="${SAMPLE_HEIGHT}" fill="url(#deskB)" />
      <rect x="65" y="70" width="220" height="120" rx="24" fill="#e9eef4" opacity="0.55" />
      <rect x="930" y="90" width="140" height="140" rx="20" fill="#d4dfeb" opacity="0.38" />

      <g transform="translate(215 120) rotate(4 340 330)" filter="url(#paperShadowB)">
        <rect x="0" y="0" width="680" height="760" fill="#fdfcf9" stroke="#d8d8d0" stroke-width="3" />
        <rect x="0" y="0" width="680" height="110" fill="#eef4fa" opacity="0.8" />
        <text x="52" y="70" font-size="34" font-family="Georgia, serif" font-weight="700" fill="#1f2c37">Northwind Studio</text>
        <text x="530" y="68" font-size="22" font-family="Arial, sans-serif" fill="#44637c">Invoice</text>

        <text x="52" y="150" font-size="14" font-family="Arial, sans-serif" fill="#4a5561">Bill to: Claire Martin</text>
        <text x="52" y="176" font-size="14" font-family="Arial, sans-serif" fill="#4a5561">Issued: 2026-04-17</text>
        <text x="52" y="202" font-size="14" font-family="Arial, sans-serif" fill="#4a5561">Due: 2026-05-01</text>

        <rect x="52" y="255" width="576" height="38" fill="#e9f1f8" />
        <text x="70" y="280" font-size="13" font-family="'Courier New', monospace" fill="#32404c">Description</text>
        <text x="430" y="280" font-size="13" font-family="'Courier New', monospace" fill="#32404c">Hours</text>
        <text x="530" y="280" font-size="13" font-family="'Courier New', monospace" fill="#32404c">Amount</text>

        ${Array.from({ length: 6 }, (_, index) => `
          <line x1="52" y1="${325 + index * 64}" x2="628" y2="${325 + index * 64}" stroke="#c7d1db" stroke-width="1.4" />
          <text x="70" y="${360 + index * 64}" font-size="14" font-family="Arial, sans-serif" fill="#354350">Design iteration ${index + 1}</text>
          <text x="442" y="${360 + index * 64}" font-size="14" font-family="'Courier New', monospace" fill="#354350">${6 + index}.0</text>
          <text x="522" y="${360 + index * 64}" font-size="14" font-family="'Courier New', monospace" fill="#354350">$${(480 + index * 65).toFixed(0)}</text>
        `).join("")}

        <rect x="392" y="675" width="236" height="80" fill="#eff5fb" />
        <text x="420" y="708" font-size="16" font-family="Arial, sans-serif" fill="#43525f">Total due</text>
        <text x="420" y="742" font-size="30" font-family="Georgia, serif" font-weight="700" fill="#1f2c37">$3,555</text>
      </g>

      <ellipse cx="575" cy="600" rx="330" ry="295" fill="#000000" opacity="0.06" />
    </svg>
  `;
}
