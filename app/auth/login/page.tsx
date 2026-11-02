import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTenantSession } from './actions';
import { TenantLoginForm } from './form';
import { getMySQLPool } from '@/lib/db/mysql';
import { protocol, rootDomain } from '@/lib/utils';

export const metadata = {
  title: 'Sign In',
  description: 'Tenant sign in for CITGROUP TENANCY SYSTEM',
  // Auth screens are never useful in a search result. The canonical is
  // removed rather than inherited from the root layout.
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default async function TenantLoginPage() {
  const session = await getTenantSession();
  if (session && session.tenantId) {
    // The session carries only the tenant id, so resolve the subdomain
    // before redirecting. Lookup failures fall through to the form rather
    // than masking the sign-in screen. `redirect()` stays outside the
    // try/catch: it works by throwing, and must never be swallowed.
    let subdomain: string | undefined;
    try {
      const pool = await getMySQLPool();
      const [rows] = await pool.execute(
        'SELECT subdomain FROM tenants WHERE id = ? LIMIT 1',
        [session.tenantId]
      );
      subdomain = (rows as Array<{ subdomain: string }>)[0]?.subdomain;
    } catch (error) {
      console.error('[auth] Failed to resolve tenant for redirect:', error instanceof Error ? error.message : 'Unknown error');
    }
    if (subdomain) {
      redirect(`${protocol}://${subdomain}.${rootDomain}/dashboard`);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-none bg-white/[0.97] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-5 text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] shadow-lg shadow-blue-600/30 transition-transform group-hover:scale-105">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
            <div className="text-left leading-none">
              <span className="block text-[13px] md:text-[15px] font-extrabold tracking-tight text-slate-900">CITGROUP</span>
              <span className="block text-[10px] font-bold tracking-[0.2em] text-[#005cb3] uppercase">Tenancy System</span>
            </div>
            <span className="sr-only">home</span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Sign in to your tenant workspace</p>
        </div>

        <TenantLoginForm />

        <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-center">
          <p className="text-sm text-slate-500">
            New to CITGROUP?{' '}
            <Link href="/auth/register" className="font-semibold text-[#005cb3] transition-colors hover:text-[#004A94] hover:underline">
              Create a tenant
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center">
          <Link href="/" className="text-sm font-medium text-[#005cb3] transition-colors hover:text-[#004A94] hover:underline">
            ← Back to System
          </Link>
        </p>
      </div>
    </div>
  );
}

