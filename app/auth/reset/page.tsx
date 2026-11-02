import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { resetRequestAction } from './actions';

export const metadata: Metadata = {
  title: 'Password Reset',
  description: 'Request a password reset link via email.',
  robots: { index: false, follow: false },
};

export default async function PasswordResetPage() {
  // If the email was submitted and token was generated, redirect to verification page
  // The verification token will be encoded in URL (to be implemented separately)
  // For now, just show the request form.

  return (
    <div className="w-full max-w-md">
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-none bg-white/[0.97] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-5 text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] shadow-lg shadow-blue-600/30 transition-transform group-hover:scale-105">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </span>
            <div className="text-left leading-none">
              <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">CITGROUP</span>
              <span className="block text-[10px] font-bold tracking-[0.2em] text-[#005cb3] uppercase">Tenancy System</span>
            </div>
            <span className="sr-only">home</span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Enter your email address and we will send you a reset link.</p>
        </div>

        <form
          // @ts-expect-error form action type matches server action return
          action={resetRequestAction}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005cb3] focus:outline-none focus:ring-1 focus:ring-[#005cb3]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-none bg-[#005cb3] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.98]"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-semibold text-[#005cb3] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
