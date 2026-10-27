import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/**
 * Robots policy.
 *
 * The admin area is unlinked from the public site and gated by `ADMIN_PATH`
 * in `proxy.ts`.
 *
 * The hidden path itself is deliberately absent from this file: robots.txt is
 * public, so naming it there would publish the one secret that keeps the
 * admin area private. The admin pages carry `robots: { index: false }` in
 * their metadata instead, which keeps them out of search indexes without
 * disclosing where they live.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/auth/admin',
          '/auth/admin/',
          '/admin',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
