'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction, type LoginState } from './actions';

export function LoginForm() {
  const [state, action, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={action} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="password">Admin password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter the admin password"
          required
          autoFocus
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}