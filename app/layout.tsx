import type { Metadata, Viewport } from 'next';

import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { siteUrl, SITE_NAME, SITE_DESCRIPTION, BRAND_COLOR } from '@/lib/seo';
import { headers } from 'next/headers';


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_NAME,
    // Every child page inherits this template, so a page only has to supply
    // its own short title.
    template: '%s | CITGROUP TENANCY SYSTEM',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: siteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    'multi-tenant',
    'multi-tenancy',
    'subdomain routing',
    'SaaS platform',
    'tenant isolation',
    'Next.js 16',
    'CITGROUP',
    'tenancy system',
  ],
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl(),
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_DESCRIPTION}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  category: 'technology',
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: BRAND_COLOR,
  colorScheme: 'light',
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  let pathname = h.get('x-invoke-path') || h.get('next-url') || '';
  if (pathname.includes('://')) {
    try { pathname = new URL(pathname).pathname; } catch { /* leave */ }
  }
  const p = pathname.split('?')[0];
  const hideBar = p.startsWith('/auth') || p.startsWith('/admin');

  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* FloatingBar removed per user requirement */}
        <SpeedInsights />
      </body>
    </html>
  );
}

