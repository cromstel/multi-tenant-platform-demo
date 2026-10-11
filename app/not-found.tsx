import Link from 'next/link';
import { headers } from 'next/headers';
import { rootDomain, protocol } from '@/lib/utils';

/**
 * Resolves the tenant slug for a 404 page.
 *
 * Two shapes are handled:
 *  - `/s/{subdomain}`  — how `proxy.ts` rewrites tenant requests
 *  - `{subdomain}.{rootDomain}` — read from the Host header when a tenant
 *    subdomain is requested directly (the rewrite never happened because the
 *    subdomain simply has no record in the store)
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

export default async function NotFound() {
  const subdomain = await resolveSubdomain();
  const apostrophe = '\u2019';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          {subdomain ? (
            <>
              <span className="text-blue-600">{subdomain}</span>.{rootDomain}{' '}
              doesn{apostrophe}t exist
            </>
          ) : (
            'Subdomain Not Found'
          )}
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          This subdomain hasn{apostrophe}t been created yet.
        </p>
        <div className="mt-6">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {subdomain ? `Create ${subdomain}` : `Go to ${rootDomain}`}
          </Link>
        </div>
      </div>
    </div>
  );
}