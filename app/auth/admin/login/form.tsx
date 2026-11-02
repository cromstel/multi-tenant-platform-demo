'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHint, TooltipProvider } from '@/components/ui/tooltip';
import { loginAction, type LoginState } from './actions';

const fieldClass =
  'h-12 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

export function AdminLoginForm() {
  const [state, action, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <TooltipProvider>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Administrator email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@company.com"
            className={fieldClass}
            required
            autoFocus
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
            <FieldHint
              id="admin-login-password-hint"
              label="About administrator access"
              content="Five failed attempts locks the account for 15 minutes. This area is not indexed by search engines and its URL is not listed on any public page."
            />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-describedby="admin-login-password-hint"
            className={fieldClass}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input id="remember" name="remember" type="checkbox" className="h-4 w-4 rounded-none border-slate-300 text-[#005cb3] focus:ring-[#005cb3]" />
          <Label htmlFor="remember" className="text-sm font-medium text-slate-700">Remember me</Label>
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-none border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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

        <div className="flex items-center justify-between pt-1">
          <a href="/auth/reset" className="text-xs font-medium text-[#005cb3] hover:underline">Forgotten your password?</a>
        </div>
      </form>
    </TooltipProvider>
  );
}

