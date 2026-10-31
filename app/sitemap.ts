import type { MetadataRoute } from 'next';
import { getAllSubdomains } from '@/lib/subdomains';
import { siteUrl } from '@/lib/seo';
import { rootDomain } from '@/lib/utils';

export const revalidate = 3600;

/**
 * Sitemap for the public surface.
 *
 * Only pages that are meant to be discovered are listed. The admin area is
 * deliberately absent — it is unlinked, gated by `ADMIN_PATH`, and marked
 * `noindex`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const isLocal = rootDomain.includes('localhost') || rootDomain.includes('127.0.0.1');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/faq`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${origin}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/auth/login`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${origin}/auth/register`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Every tenant has its own public page on its own subdomain. The subdomain
  // replaces the host label but keeps the port — browsers read the port from
  // the hostname, so dropping it would send readers to port 80.
  const host = rootDomain.split(':')[0];
  const port = rootDomain.includes(':') ? `:${rootDomain.split(':')[1]}` : '';

  let tenantRoutes: MetadataRoute.Sitemap = [];

  try {
    const tenants = await getAllSubdomains();
    tenantRoutes = tenants.map((tenant) => ({
      url: `${isLocal ? 'http' : 'https'}://${tenant.subdomain}.${host}${port}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch {
    // A missing database should not break the sitemap for the static routes.
    tenantRoutes = [];
  }

  return [...staticRoutes, ...tenantRoutes];
}
