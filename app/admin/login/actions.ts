'use server';

import { redirect } from 'next/navigation';
import {
  createSession,
  destroySession,
  isAdminConfigured,
  verifyAdminPassword
} from '@/lib/auth';
import {
  LOGIN_LIMIT,
  check,
  consume,
  reset
} from '@/lib/rate-limit';

export type LoginState = {
  error?: string;
};

function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

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

  // Reject early if the window is already exhausted, so a locked-out client
  // cannot burn a Redis round trip per attempt.
  const before = await check('login', LOGIN_LIMIT);
  if (!before.allowed) {
    return {
      error: `Too many failed attempts. Try again in about ${minutesLabel(
        before.retryAfterSeconds
      )}.`
    };
  }

  const password = formData.get('password');
  if (typeof password !== 'string' || password.length === 0) {
    return { error: 'Enter the admin password.' };
  }

  const verdict = await consume('login', LOGIN_LIMIT);

  if (!verifyAdminPassword(password)) {
    // Deliberately does not distinguish a wrong password from an empty one,
    // so the response reveals nothing about the stored credential.
    return {
      error:
        verdict.attemptsLeft === 0
          ? `Incorrect password. Locked for ${minutesLabel(
              verdict.retryAfterSeconds
            )}.`
          : `Incorrect password. ${verdict.attemptsLeft} attempt${
              verdict.attemptsLeft === 1 ? '' : 's'
            } remaining before lockout.`
    };
  }

  // The attempt was wrong-window or the client had already exhausted it;
  // either way there is no session to create.
  if (!verdict.allowed) {
    return {
      error: `Too many failed attempts. Try again in about ${minutesLabel(
        verdict.retryAfterSeconds
      )}.`
    };
  }

  await reset('login');
  await createSession();

  // `redirect` throws, so nothing below it runs.
  redirect('/admin');
}

/** Ends the session and returns to the login screen. */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}