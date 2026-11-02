import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { verifyResetTokenAction } from '../actions';

export const metadata: Metadata = {
  title: 'Verify Reset Token',
  description: 'Enter your reset token to verify and set a new password.',
  robots: { index: false, follow: false },
};

export default async function VerifyResetPage({ params }: { params: { token: string } }) {
  const { success, user } = await verifyResetTokenAction(params.token);

  if (!success) {
    redirect('/auth/login');
  }

  return (
    <div className="w-full max-w-md">
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-none bg-white/[0.97] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Verify Reset Token</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your token has been verified. Proceed to reset your password.
          </p>
        </div>

        <form // @ts-expect-error server action return type
          action={verifyResetTokenAction} method="post" className="space-y-4">
          <input type="hidden" name="token" value={params.token} />
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">New password</label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              required
              minLength={8}
              placeholder="Enter a new password"
              className="mt-1 block w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#005cb3] focus:outline-none focus:ring-1 focus:ring-[#005cb3]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-none bg-[#005cb3] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.98]"
          >
            Set New Password
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
