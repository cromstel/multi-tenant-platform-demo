import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle with only the modules that are
  // actually imported. This is what the Docker runtime stage copies, and
  // it keeps the image small.
  output: 'standalone',
  // Pin the Turbopack root to this package. Without it Next.js walks up the
  // filesystem looking for a lockfile and can latch onto a parent directory
  // (e.g. a stray package-lock.json in $HOME), which triggers a build
  // warning and breaks file tracing/monorepo detection.
  turbopack: {
    root: projectRoot,
  },
  // The dev server blocks cross-origin requests to /_next/* (HMR, chunk
  // loading) from hosts it does not recognise. `localhost` and the LAN IP
  // are covered by default, but `127.0.0.1` is a different origin — it has
  // to be listed explicitly or the browser console fills with warnings and
  // hot reload silently breaks.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // The standalone server needs the `nodejs` tracer to resolve the
  // project's own files (and the `mysql2` native bindings) at runtime.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/mysql2/**/*'],
  },
  poweredByHeader: false,
  // Ensure proper handling of Vercel Analytics and Speed Insights
  // headers: async () => {
  //   return [
  //     {
  //       source: '/_vercel/speed-insights/script.js',
  //       headers: [
  //         {
  //           key: 'Cache-Control',
  //           value: 'public, max-age=31536000, immutable',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;