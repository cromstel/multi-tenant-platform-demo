import { headers } from 'next/headers';

import { NotFoundScreen } from '@/components/not-found-screen';
import { rootDomain } from '@/lib/utils';

/**
 * Resolves the tenant slug for a 404 inside the subdomain segment.
 *
 * Two shapes arrive here:
 *  - `{subdomain}.{rootDomain}` — read from the `Host` header
 *  - `/s/{subdomain}` — the proxy's internal rewrite, which keeps the host
 *
 * Reading `headers()` is safe here: every route under `/s/[subdomain]` is
 * rendered on demand anyway, so this cannot make a prerendered page dynamic.
 */
async function resolveSubdomain(): Promise<string | null> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').split(':')[0];
  const rootDomainHost = rootDomain.split(':')[0];

  if (host && host.endsWith(`.${rootDomainHost}`)) {
    return host.replace(`.${rootDomainHost}`, '') || null;
  }

  if (host && host !== rootDomainHost && !host.endsWith('.vercel.app')) {
    return host.split('.')[0] || null;
  }

  return null;
}

export default async function TenantNotFound() {
  return <NotFoundScreen subdomain={await resolveSubdomain()} />;
}
