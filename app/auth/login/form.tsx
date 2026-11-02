'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHint, TooltipProvider } from '@/components/ui/tooltip';
import { loginAction, type LoginState } from './actions';

const fieldClass =
  'h-10 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

export function TenantLoginForm() {
  const [state, action, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <TooltipProvider>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="subdomain" className="mb-1.5 block text-sm font-medium text-slate-700">
            Subdomain
          </Label>
          <Input
            id="subdomain"
            name="subdomain"
            type="text"
            autoComplete="off"
            placeholder="your-company"
            className={fieldClass}
            required
            autoFocus
          />
        </div>

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
            className={fieldClass}
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
            <FieldHint
              id="tenant-login-password-hint"
              label="About your password"
              content="Passwords are case sensitive. If you have forgotten yours, ask a tenant owner to reset it from the admin dashboard."
            />
            <Link href="/auth/reset" className="ml-auto text-xs font-medium text-[#005cb3] hover:underline whitespace-nowrap">
              Forgotten your password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-describedby="tenant-login-password-hint"
            className={fieldClass}
            required
          />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="h-4 w-4 rounded-none border-slate-300 text-[#005cb3] focus:ring-[#005cb3]"
          />
          <Label htmlFor="remember" className="text-sm font-medium text-slate-700">Remember me</Label>
        </div>

        {state.error && (
          <p
            role="alert"
            className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full rounded-none bg-[#005cb3] text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.99]"
        >
          {isPending ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </TooltipProvider>
  );
}

