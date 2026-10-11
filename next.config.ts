import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this package. Without it Next.js walks up the
  // filesystem looking for a lockfile and can latch onto a parent directory
  // (e.g. a stray package-lock.json in $HOME), which triggers a build
  // warning and breaks file tracing/monorepo detection.
  turbopack: {
    root: projectRoot,
  },
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