import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/src/providers";

import "@fontsource/work-sans/index.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearSheet",
  description: "Document scanning and OCR workspace powered by FastAPI and OpenCV.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
