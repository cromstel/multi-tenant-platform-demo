import Link from 'next/link';

import { protocol, rootDomain } from '@/lib/utils';

/**
 * Shared presentation for both 404 routes.
 *
 * `subdomain` is supplied by the tenant segment's not-found boundary, which
 * is the only place that needs the `Host` header. Keeping `headers()` out of
 * the root `not-found.tsx` matters: a request-time API in the root boundary
 * makes *every* route in the app render on demand, so the public pages lose
 * static prerendering.
 */
export function NotFoundScreen({ subdomain }: { subdomain?: string | null }) {
  const apostrophe = '\u2019';
  const homeUrl = `${protocol}://${rootDomain}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <Link
            href={homeUrl}
            className="group flex items-center gap-2.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2] focus-visible:ring-offset-2"
          >
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
              <span className="text-[#005cb3]">{subdomain}</span>.{rootDomain}{' '}
              doesn{apostrophe}t exist
            </>
          ) : (
            'Page Not Found'
          )}
        </h1>

        <p className="mt-3 text-lg text-gray-600">
          {subdomain
            ? `This subdomain hasn${apostrophe}t been created yet.`
            : `The page you${apostrophe}re looking for doesn${apostrophe}t exist.`}
        </p>

        <div className="mt-6">
          <Link
            href={homeUrl}
            className="inline-flex items-center justify-center rounded-none bg-[#005cb3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004A94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2] focus-visible:ring-offset-2"
          >
            {subdomain ? `Create ${subdomain}` : 'Go to CITGROUP TENANCY SYSTEM'}
          </Link>
        </div>
      </div>
    </div>
  );
}
