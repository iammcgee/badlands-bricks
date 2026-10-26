import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  outputFileTracingExcludes: {
    "*": ["./uploads/**", "./product-files/**", "./.git/**"],
  },
};

export default nextConfig;
