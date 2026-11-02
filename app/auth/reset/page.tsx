import type { Metadata } from 'next';
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
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your email address and we will send you a reset link.</p>
        </div>

        <form action={resetRequestAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
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
          <a href="/auth/login" className="font-semibold text-[#005cb3] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
