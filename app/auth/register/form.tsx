'use client';

import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmojiField } from '@/components/emoji-field';
import { FieldHint, TooltipProvider } from '@/components/ui/tooltip';
import { rootDomain } from '@/lib/utils';
import { type RegisterState } from './actions';

const fieldClass =
  'h-12 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

function SubdomainInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex items-center">
      <div className="relative flex-1">
        <Input
          id="subdomain"
          name="subdomain"
          placeholder="your-company"
          defaultValue={defaultValue}
          className={`${fieldClass} w-full rounded-r-none focus:z-10`}
          required
        />
      </div>
      <span className="flex min-h-[48px] items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-600">
        .{rootDomain}
      </span>
    </div>
  );
}

export function TenantRegisterForm({
  action,
}: {
  action: (state: RegisterState, formData: FormData) => Promise<RegisterState>;
}) {
  const [icon, setIcon] = useState('');

  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(
    action,
    {}
  );

  return (
    <TooltipProvider>
      <form action={formAction} className="space-y-4">
        {/* Subdomain */}
        <div>
          <Label htmlFor="subdomain" className="mb-1.5 block text-sm font-medium text-slate-700">
            Subdomain
          </Label>
          <SubdomainInput defaultValue={state?.subdomain} />
          <p className="mt-1.5 text-xs text-slate-500">
            Your tenant is reachable at{' '}
            <span className="font-medium text-slate-600">
              {'{subdomain}'}.{rootDomain}
            </span>
          </p>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Work email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={state?.email}
            className={fieldClass}
            required
          />
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
            <FieldHint
              id="register-password-hint"
              label="Password requirements"
              content="At least 8 characters. Mix letters, numbers and symbols — a long passphrase is stronger than a short complex one."
            />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter a password of 8+ characters"
            aria-describedby="register-password-hint"
            className={fieldClass}
            required
            minLength={8}
          />
        </div>

        {/* Confirm password */}
        <div>
          <Label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            aria-describedby="register-password-hint"
            className={fieldClass}
            required
            minLength={8}
          />
        </div>

        {/* Brand mark */}
        <EmojiField
          label="Brand mark"
          hint="An emoji shown on your tenant's page and in the admin dashboard. Pick one that represents your company."
          value={icon}
          onChange={setIcon}
        />

        {state?.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending || !icon}
          className="h-12 w-full rounded-xl bg-[#005cb3] text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.99]"
        >
          {isPending ? 'Creating…' : 'Create Tenant'}
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          Your tenant is provisioned with its own subdomain and isolated data.
          You can add members from the dashboard afterwards.
        </p>
      </form>
    </TooltipProvider>
  );
}
