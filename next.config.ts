import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle with only the modules that are
  // actually imported. This is what the Docker runtime stage copies, and
  // it keeps the image small.
  output: 'standalone',
  // Empty Turbopack config to silence the Next.js 16 warning about
  // mixing webpack config with Turbopack. mysql2 aliasing is done via
  // the webpack config below, which applies when running with --webpack.
  turbopack: {},
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
  // Prevent mysql2 (Node-only, requires net/tls) from being bundled into
  // client components. mysql2 is only used server-side via Server Actions.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'mysql2': false,
        'mysql2/promise': false,
      };
    }
    return config;
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