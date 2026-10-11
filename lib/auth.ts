import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';

/**
 * Admin authentication — the Data Access Layer for privileged operations.
 *
 * Per the Next.js data-security guidance this module is the only place that
 * touches the session secret or decides who is an admin, and it runs
 * server-side only (`server-only` import). Callers must not re-implement any
 * of this.
 *
 * Two ways in, and BOTH are required:
 *
 *   - `requireAdmin()`  — for pages. Redirects to the login screen.
 *   - `getSession()`    — for Server Actions. Server Actions are reachable by
 *                         direct POST, so a page-level check does not cover
 *                         them; every action must re-verify on its own.
 */

export const SESSION_COOKIE = 'platforms_admin_session';

/** Sessions are short-lived by design; admin is not a "stay logged in" surface. */
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const ISSUER = 'platforms-starter';

export type AdminSession = {
  /** Stable, non-identifying id for this session. */
  sid: string;
};

/**
 * Reads and validates configuration. Fails closed: a misconfigured deployment
 * must deny access, never grant it.
 */
function getAuthConfig() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;

  const missing: string[] = [];
  if (!secret || secret.length < 32) missing.push('ADMIN_SESSION_SECRET (32+ chars)');
  if (!password) missing.push('ADMIN_PASSWORD');
  if (missing.length > 0) {
    throw new Error(
      `Admin access is not configured. Set ${missing.join(' and ')} in the ` +
        `environment. See .env.example.`
    );
  }

  return { secret, password };
}

/** True when admin access is usable at all. Safe to call from pages. */
export function isAdminConfigured(): boolean {
  try {
    getAuthConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * Both sides are hashed first so the buffers are always the same length —
 * `timingSafeEqual` throws otherwise, and differing lengths would otherwise
 * short-circuit before the comparison.
 */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a, 'utf8').digest();
  const hashB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(hashA, hashB);
}

/** Verifies an admin password. Always runs the comparison, even when unset. */
export function verifyAdminPassword(candidate: string): boolean {
  const configured = process.env.ADMIN_PASSWORD;

  if (!configured) {
    // Still burn a comparison so an unconfigured deployment does not respond
    // measurably faster than a wrong password.
    safeEqual(candidate, candidate);
    return false;
  }

  return safeEqual(candidate, configured);
}

async function getSessionSecret(): Promise<Uint8Array> {
  return new TextEncoder().encode(getAuthConfig().secret);
}

/** Issues a signed session cookie. Server Action / Route Handler only. */
export async function createSession(): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setJti(crypto.randomUUID())
    .sign(await getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
}

/** Clears the session cookie. Server Action / Route Handler only. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Returns the current admin session, or `null`.
 *
 * Memoized with React `cache()` so a page, its layout and its actions share a
 * single verification per request.
 */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  if (!isAdminConfigured()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, await getSessionSecret(), {
      issuer: ISSUER
    });
    return { sid: payload.jti ?? 'unknown' };
  } catch {
    // Expired, tampered with, or signed by a rotated secret.
    return null;
  }
});

/** For pages: returns the session or redirects to the login screen. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return session;
}