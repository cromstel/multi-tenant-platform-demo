'use server';

import { getMySQLPool } from '@/lib/db/mysql';
import { consume } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';

export type ContactCategory =
  | 'support'
  | 'sales'
  | 'billing'
  | 'partnership'
  | 'feedback'
  | 'other';

export type ContactState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<'name' | 'email' | 'subject' | 'message', string>>;
  /** Echoed back so the form can keep what the user typed. */
  values?: {
    name?: string;
    email?: string;
    company?: string;
    category?: string;
    subject?: string;
    message?: string;
  };
};

const VALID_CATEGORIES: ContactCategory[] = [
  'support',
  'sales',
  'billing',
  'partnership',
  'feedback',
  'other',
];

/** 5 enquiries per IP per hour — enough for a real conversation, not for spam. */
const CONTACT_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

const MAX_NAME = 120;
const MAX_EMAIL = 255;
const MAX_COMPANY = 160;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function isValidEmail(value: string): boolean {
  // Deliberately permissive: the only real test of an address is sending to
  // it. A strict regex rejects valid addresses more often than it catches
  // typos.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= MAX_EMAIL;
}

/** Trims and caps a field, returning an empty string when it is only whitespace. */
function clean(value: FormDataEntryValue | null, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export async function submitContactAction(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Throttle every attempt, not just the successful ones — otherwise a bot
  // can fill the table without ever consuming budget.
  const limit = await consume('contact', CONTACT_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many messages sent. Try again in about ${Math.max(
        1,
        Math.ceil(limit.retryAfterSeconds / 60)
      )} minutes.`,
    };
  }

  const name = clean(formData.get('name'), MAX_NAME);
  const email = clean(formData.get('email'), MAX_EMAIL);
  const company = clean(formData.get('company'), MAX_COMPANY);
  const subject = clean(formData.get('subject'), MAX_SUBJECT);
  const message = clean(formData.get('message'), MAX_MESSAGE);
  const rawCategory = clean(formData.get('category'), 32);
  const category = (VALID_CATEGORIES.includes(rawCategory as ContactCategory)
    ? rawCategory
    : 'support') as ContactCategory;

  // A honeypot: a real browser leaves this hidden field empty. Filling it in
  // is the signature of a bot, so the submission is accepted silently and
  // dropped — the sender is not told they were caught.
  const trap = clean(formData.get('website'), 200);
  if (trap) {
    return { success: 'Thanks — your message has been received.' };
  }

  const fieldErrors: ContactState['fieldErrors'] = {};

  if (!name) fieldErrors.name = 'Please enter your name.';
  if (!email) fieldErrors.email = 'Please enter your email address.';
  else if (!isValidEmail(email)) fieldErrors.email = 'That does not look like an email address.';
  if (!subject) fieldErrors.subject = 'Please add a subject.';
  if (!message) fieldErrors.message = 'Please tell us how we can help.';
  else if (message.length < 20) {
    fieldErrors.message = 'Please add a little more detail (at least 20 characters).';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Please correct the highlighted fields.',
      fieldErrors,
      values: { name, email, company, category, subject, message },
    };
  }

  try {
    const pool = await getMySQLPool();
    await pool.execute(
      `INSERT INTO contact_enquiries (name, email, company, category, subject, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, company || null, category, subject, message]
    );
  } catch {
    return {
      error: 'Your message could not be sent right now. Please try again shortly.',
      values: { name, email, company, category, subject, message },
    };
  }

  revalidatePath('/contact');

  return {
    success:
      'Thanks — your message has been received. Our team replies within one business day.',
  };
}
