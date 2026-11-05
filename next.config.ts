import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle with only the modules that are
  // actually imported. This is what the Docker runtime stage copies, and
  // it keeps the image small.
  output: 'standalone',
  // mysql2 requires Node-only built-ins (net, tls) and must never reach
  // the client bundle. It is imported dynamically in lib/db/mysql.ts and
  // only used server-side via Server Actions.
  serverExternalPackages: ['mysql2'],
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
  devIndicators: false,

  // Strict CSP: default-deny with exceptions for the application's own
  // origin, inline scripts/styles (Next.js requires them for RSC/HMR),
  // and the data/health endpoints. No third-party scripts or images.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://openrouter.ai https://api.openai.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
