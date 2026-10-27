import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_SHORT_NAME, SITE_DESCRIPTION, BRAND_COLOR } from '@/lib/seo';

/**
 * Web app manifest.
 *
 * Makes the installable-app prompt work on mobile and desktop, and pins the
 * theme colour so the browser chrome matches the brand.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0c2238',
    theme_color: BRAND_COLOR,
    categories: ['business', 'productivity', 'developer'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Create a tenant',
        short_name: 'Create',
        url: '/auth/register',
      },
      {
        name: 'Sign in',
        short_name: 'Sign in',
        url: '/auth/login',
      },
      {
        name: 'Contact support',
        short_name: 'Support',
        url: '/contact',
      },
    ],
  };
}
