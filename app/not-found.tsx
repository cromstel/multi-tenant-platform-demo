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
        <div className="mb-8 flex justify-center">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] shadow-lg shadow-blue-600/25 transition-transform group-hover:scale-105">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
            <div className="text-left leading-none">
              <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">CITGROUP</span>
              <span className="block text-[10px] font-bold tracking-[0.2em] text-[#005cb3] uppercase">Tenancy System</span>
            </div>
            <span className="sr-only">home</span>
          </Link>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          {subdomain ? (
            <>
              <span className="text-blue-600">{subdomain}</span>.localhost:3030{' '}
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
            href={`${protocol}://localhost:3030`}
            className="rounded-noned bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {subdomain ? `Create ${subdomain}` : 'Go to CITGROUP TENANCY SYSTEM'}
          </Link>
        </div>
      </div>
    </div>
  );
}