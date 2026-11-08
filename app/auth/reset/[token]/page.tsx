import type { Metadata } from 'next';

import { Input } from '@/components/ui/input';

import { verifyResetTokenAction } from '../actions';

const fieldClass =
  'h-12 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

export const metadata: Metadata = {
  title: 'Verify Reset Token',
  description: 'Enter your reset token to verify and set a new password.',
  robots: { index: false, follow: false },
};

export default async function VerifyResetPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="w-full max-w-md">
      <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-none bg-white/[0.97] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Verify Reset Token</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your token has been verified. Proceed to reset your password.
          </p>
        </div>

        <form
          action={async (formData: FormData) => {
            'use server'
            await verifyResetTokenAction(formData)
          }}
          method="post"
          className="space-y-4"
        >
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">New password</label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              required
              minLength={8}
              placeholder="Enter a new password"
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-none bg-[#005cb3] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#004A94] active:scale-[0.98]"
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
