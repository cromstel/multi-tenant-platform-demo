'use client';

import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHint, TooltipProvider } from '@/components/ui/tooltip';
import { rootDomain } from '@/lib/utils';
import { type RegisterState } from './actions';

const fieldClass =
  'h-12 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

function SubdomainInput({ defaultValue, onChange }: { defaultValue?: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex items-center">
      <div className="relative flex-1">
        <Input
          id="subdomain"
          name="subdomain"
          placeholder="your-company"
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${fieldClass} w-full rounded-r-none focus:z-10`}
          required
        />
      </div>
      <span className="flex min-h-[48px] items-center rounded-r-none border border-l-0 border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-600">
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
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(
    action,
    {}
  );
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const complete = subdomain.trim() && firstName.trim() && lastName.trim() && email.trim() && confirmEmail.trim() && password.length >= 8 && confirm.length >= 8;

  return (
    <TooltipProvider>
      <form action={formAction} className="space-y-4">
        {/* Contact — First / Last Name */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">First name</Label>
            <Input id="firstName" name="firstName" type="text" autoComplete="given-name" placeholder="Jane" onChange={(e)=>setFirstName(e.target.value)} className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">Last name</Label>
            <Input id="lastName" name="lastName" type="text" autoComplete="family-name" placeholder="Doe" onChange={(e)=>setLastName(e.target.value)} className={fieldClass} required />
          </div>
        </div>

        {/* Subdomain */}
        <div>
          <Label htmlFor="subdomain" className="mb-1.5 block text-sm font-medium text-slate-700">
            Subdomain
          </Label>
          <SubdomainInput defaultValue={state?.subdomain} onChange={setSubdomain} />
          <p className="mt-1.5 text-xs text-slate-500">
            Your tenant is reachable at{' '}
            <span className="font-medium text-slate-600">
              {'{subdomain}'}.{rootDomain}
            </span>
          </p>
        </div>

        {/* Email — inline Confirm Email */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Work email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" defaultValue={state?.email} onChange={(e)=>setEmail(e.target.value)} className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="confirmEmail" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm email</Label>
            <Input id="confirmEmail" name="confirmEmail" type="email" autoComplete="email" placeholder="Re-enter email" onChange={(e)=>setConfirmEmail(e.target.value)} className={fieldClass} required />
          </div>
        </div>

        {/* Password + Confirm — inline */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <FieldHint id="register-password-hint" label="Password requirements" content="At least 8 characters. Mix letters, numbers and symbols — a long passphrase is stronger than a short complex one." />
            </div>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Enter a password of 8+ characters" aria-describedby="register-password-hint" onChange={(e)=>setPassword(e.target.value)} className={fieldClass} required minLength={8} />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" aria-describedby="register-password-hint" onChange={(e)=>setConfirm(e.target.value)} className={fieldClass} required minLength={8} />
          </div>
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
          disabled={isPending || !complete}
          className={`h-12 w-full rounded-none bg-[#005cb3] text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.99] ${!complete ? 'opacity-40' : ''}`}
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
