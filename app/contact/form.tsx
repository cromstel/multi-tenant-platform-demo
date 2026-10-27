'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitContactAction, type ContactState } from './actions';

const CATEGORIES = [
  { value: 'support', label: 'Technical support' },
  { value: 'sales', label: 'Sales enquiry' },
  { value: 'billing', label: 'Billing & invoices' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'feedback', label: 'Product feedback' },
  { value: 'other', label: 'Something else' },
];

const fieldClass =
  'h-12 bg-slate-50 border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20 text-base';

export function ContactForm() {
  const [state, formAction, isPending] = useActionState<ContactState, FormData>(
    submitContactAction,
    {}
  );

  const [category, setCategory] = useState(state.values?.category || 'support');

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
          Message sent
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
          {state.success}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#005cb3] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.98]"
        >
          Back to the platform
        </Link>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name <span className="text-red-600">*</span>
          </label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Jane Smith"
            defaultValue={state.values?.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={`${fieldClass} ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          />
          {errors.name && (
            <p id="name-error" className="mt-1.5 text-xs text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Work email <span className="text-red-600">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jane@company.com"
            defaultValue={state.values?.email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`${fieldClass} ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-600">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-slate-700">
            Company
          </label>
          <Input
            id="company"
            name="company"
            autoComplete="organization"
            placeholder="Acme Corporation"
            defaultValue={state.values?.company}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">
            Topic <span className="text-red-600">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${fieldClass} w-full border border-slate-200 text-slate-700 focus:border-[#0078E2] focus:outline-none focus:ring-2 focus:ring-[#0078E2]/20`}
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-slate-700">
          Subject <span className="text-red-600">*</span>
        </label>
        <Input
          id="subject"
          name="subject"
          placeholder="How can we help?"
          defaultValue={state.values?.subject}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
          className={`${fieldClass} ${errors.subject ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.subject && (
          <p id="subject-error" className="mt-1.5 text-xs text-red-600">
            {errors.subject}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-700">
          Message <span className="text-red-600">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder="Tell us what you need help with, and include any error messages or tenant names."
          defaultValue={state.values?.message}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'message-error' : 'message-hint'}
          className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-500 focus:border-[#0078E2] focus:outline-none focus:ring-2 focus:ring-[#0078E2]/20 ${
            errors.message ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
          }`}
        />
        {errors.message ? (
          <p id="message-error" className="mt-1.5 text-xs text-red-600">
            {errors.message}
          </p>
        ) : (
          <p id="message-hint" className="mt-1.5 text-xs text-slate-500">
            The more detail you give, the faster we can help.
          </p>
        )}
      </div>

      {/* Honeypot — hidden from users, filled in by bots. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-[#005cb3] text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.99] disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send message'}
      </Button>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        We only use your details to answer this enquiry. We never sell or share them.
      </p>
    </form>
  );
}
