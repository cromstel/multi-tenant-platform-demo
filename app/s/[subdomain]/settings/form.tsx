'use client';

import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmojiField } from '@/components/emoji-field';
import { TooltipProvider } from '@/components/ui/tooltip';
import { updateTenantBranding, type SettingsState } from './actions';

export function SettingsForm({
  tenant
}: {
  tenant: { emoji: string };
}) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(
    updateTenantBranding,
    {}
  );
  const [icon, setIcon] = useState(tenant.emoji);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="bg-white rounded-none border border-[#0078E2]/20 shadow-sm p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#005cb3]">Tenant branding</h2>
          <p className="text-sm text-slate-600 mb-4">
            Choose the emoji that represents {tenant.emoji} across the workspace.
          </p>

          <form action={formAction} className="space-y-4 max-w-md">
            <EmojiField
              name="icon"
              label="Brand mark"
              value={icon}
              onChange={setIcon}
              hint="A single emoji used as the tenant's brand mark."
              required
            />

            {state?.error && (
              <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}
            {state?.success && (
              <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Brand mark updated.
              </p>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full rounded-none bg-[#005cb3] text-base font-semibold text-white transition-all hover:bg-[#004A94] active:scale-[0.99]"
            >
              {isPending ? 'Saving…' : 'Save branding'}
            </Button>
          </form>
        </div>
      </div>
    </TooltipProvider>
  );
}
