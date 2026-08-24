import { fileURLToPath } from "node:url";
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Gzip/brotli compression for all responses.
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "unpkg.com" },
    ],
  },
  experimental: {
    // Tree-shake barrel files: only the icons/charts actually imported
    // end up in the client bundle (large FCP win — lucide alone is ~1500
    // modules when pulled whole).
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
