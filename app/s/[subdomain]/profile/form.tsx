'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipProvider } from '@/components/ui/tooltip';
import { updateProfile, type ProfileState } from './actions';

const fieldClass =
  'h-12 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

export function ProfileForm({
  user
}: {
  user: { email: string; role: string; created_at: Date };
}) {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {}
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Read-only profile info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-none border border-[#0078E2]/20 shadow-sm p-6">
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-lg font-bold text-[#005cb3] mt-1 break-all">
              {user.email}
            </p>
          </div>
          <div className="bg-white rounded-none border border-[#0078E2]/20 shadow-sm p-6">
            <p className="text-sm text-slate-500">Role</p>
            <p className="text-lg font-bold text-[#005cb3] mt-1 capitalize">
              {user.role}
            </p>
          </div>
          <div className="bg-white rounded-none border border-[#0078E2]/20 shadow-sm p-6">
            <p className="text-sm text-slate-500">Member since</p>
            <p className="text-lg font-bold text-[#005cb3] mt-1">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Update form */}
        <div className="bg-white rounded-none border border-[#0078E2]/20 shadow-sm p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#005cb3]">Update email</h2>
          <form action={formAction} className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                className={fieldClass}
                required
              />
            </div>

            {state?.error && (
              <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}
            {state?.success && (
              <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Email updated successfully.
              </p>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full rounded-none bg-[#005cb3] text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.99]"
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </div>
      </div>
    </TooltipProvider>
  );
}
