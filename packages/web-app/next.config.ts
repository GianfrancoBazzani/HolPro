import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { globalNotFound: true },
  transpilePackages: ["@holpro/db"],
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default nextConfig;
