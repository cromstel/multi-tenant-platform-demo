import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from './actions';
import { AdminLoginForm } from './form';
import { adminUrl } from '@/lib/admin-path';

export const metadata = {
  title: 'Admin Sign In',
  description: 'Admin authentication for CITGROUP TENANCY SYSTEM',
  // The admin area is not a public page — keep it out of search indexes.
  // The canonical is removed rather than inherited from the root layout:
  // the real path is hidden by the proxy, so it must not be advertised.
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default async function AdminLoginPage() {
  if (await getAdminSession()) {
    redirect(adminUrl());
  }

  return (
    <div className="w-full max-w-sm">
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-none bg-white/[0.97] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-5 text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] shadow-lg shadow-blue-600/30 transition-transform group-hover:scale-105">
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
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">Admin Sign In</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Secure access for site administrators</p>
        </div>

        <AdminLoginForm />

        <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Protected by two independent authorization checks
        </p>
      </div>

      <p className="mt-4 text-center">
        <Link href="/" className="text-sm font-medium text-blue-200/75 transition-colors hover:text-white">
          ← Back to System
        </Link>
      </p>
    </div>
  );
}

