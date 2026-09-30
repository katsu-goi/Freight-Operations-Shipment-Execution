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
  // Removed optimizePackageImports — caused __webpack_modules__[moduleId] is not a function
  // with lucide-react + React 19 + Webpack (Next 15.5.23) on HMR.
  // Keeping it caused intermittent 500 on /login after edits.
};

export default nextConfig;
