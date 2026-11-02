import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { verifyResetTokenAction } from './actions';

export const metadata: Metadata = {
  title: 'Verify Reset Token',
  description: 'Enter your reset token to verify and set a new password.',
  robots: { index: false, follow: false },
};

export default async function VerifyResetPage({ params }: { params: { token: string } }) {
  // Verify the token and get user info
  const { success, user } = await verifyResetTokenAction(params.token);

  if (!success) {
    // Redirect to login if token is invalid or expired
    redirect('/auth/login');
  }

  return (
    <div className="w-full max-w-md">
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-none bg-white/[0.97] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Verify Reset Token</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the reset token sent to your email to verify and set a new password.
          </p>
        </div>

        <div className="mt-5">
          <form action={verifyResetTokenAction} className="space-y-4">
            <input
              name="token"
              type="text"
              className="block w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#005cb3] focus:outline-none focus:ring-1 focus:ring-[#005cb3]"
              placeholder="Enter reset token"
              required
              aria-label="Reset token"
            />
            <button
              type="submit"
              className="w-full rounded-none bg-[#005cb3] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.98]"
            >
              Verify Token
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have a reset link? <a href="/auth/reset" className="font-semibold text-[#005cb3] hover:underline">Request a reset link</a>.
        </p>
      </div>
    </div>
  );
}