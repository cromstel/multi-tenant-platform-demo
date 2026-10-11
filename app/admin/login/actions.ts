'use server';

import { redirect } from 'next/navigation';
import {
  createSession,
  destroySession,
  isAdminConfigured,
  verifyAdminPassword
} from '@/lib/auth';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure
} from '@/lib/rate-limit';

export type LoginState = {
  error?: string;
};

/**
 * Exchanges an admin password for a signed session cookie.
 *
 * Cookies can only be written from a Server Action or Route Handler, never
 * during render (`cookies.md`), which is why this is an action and not a page.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return {
      error:
        'Admin access is not configured. Set ADMIN_PASSWORD and ' +
        'ADMIN_SESSION_SECRET in the environment (see .env.example).'
    };
  }

  const limiter = await checkLoginRateLimit();
  if (!limiter.allowed) {
    const minutes = Math.ceil(limiter.retryAfterSeconds / 60);
    return {
      error: `Too many failed attempts. Try again in about ${minutes} minute${
        minutes === 1 ? '' : 's'
      }.`
    };
  }

  const password = formData.get('password');
  if (typeof password !== 'string' || password.length === 0) {
    return { error: 'Enter the admin password.' };
  }

  if (!verifyAdminPassword(password)) {
    const result = await recordLoginFailure();
    // Deliberately does not say whether the password was wrong or the account
    // exists — the response is identical either way.
    return {
      error: result.allowed
        ? `Incorrect password. ${result.attemptsLeft} attempt${
            result.attemptsLeft === 1 ? '' : 's'
          } remaining before lockout.`
        : `Incorrect password. Locked for ${Math.ceil(
            result.retryAfterSeconds / 60
          )} more minute(s).`
    };
  }

  await clearLoginFailures();
  await createSession();

  // `redirect` throws, so nothing below it runs.
  redirect('/admin');
}

/** Ends the session and returns to the login screen. */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}