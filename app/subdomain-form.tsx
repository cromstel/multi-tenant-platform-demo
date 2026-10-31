'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSubdomainAction } from '@/app/actions';
import { rootDomain } from '@/lib/utils';

type CreateState = {
  error?: string;
  success?: boolean;
  subdomain?: string;
  icon?: string;
};

function SubdomainInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex items-center">
      <div className="relative flex-1">
        <Input
          id="subdomain"
          name="subdomain"
          placeholder="your-company"
          defaultValue={defaultValue}
          className="h-12 w-full rounded-r-none border-slate-200 bg-slate-50 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 focus:z-10"
          required
        />
      </div>
      <span className="flex min-h-[48px] items-center rounded-r-none border border-l-0 border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-600">
        .{rootDomain}
      </span>
    </div>
  );
}

export function SubdomainForm() {
  const [state, action, isPending] = useActionState<CreateState, FormData>(
    createSubdomainAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="subdomain" className="mb-1.5 block text-sm font-medium text-slate-700">
          Subdomain
        </Label>
        <SubdomainInput defaultValue={state?.subdomain} />
      </div>

      {state?.error && (
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
        {isPending ? 'Creating…' : 'Create Subdomain'}
      </Button>
    </form>
  );
}
