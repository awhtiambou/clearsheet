import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  experimental: {
    workerThreads: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
