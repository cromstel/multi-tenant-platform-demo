import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { getAdminSession } from '@/app/auth/admin/login/actions';
import { consume } from '@/lib/rate-limit';

/**
 * Shared plumbing for the JSON API.
 *
 * Every response is JSON with a consistent envelope, so a client can branch on
 * `ok` rather than guessing from the status code alone.
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
} as const;

/** A successful JSON response. */
export function ok<T>(data: T, status = 200, headers: HeadersInit = {}) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

/** A failed JSON response. */
export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message, details } },
    { status, headers: JSON_HEADERS }
  );
}

/** Standard error responses. */
export const apiErrors = {
  unauthorized: () => fail('unauthorized', 'Authentication required.', 401),
  forbidden: () => fail('forbidden', 'You do not have access to this resource.', 403),
  notFound: (what = 'Resource') => fail('not_found', `${what} not found.`, 404),
  badRequest: (message: string, details?: unknown) =>
    fail('bad_request', message, 400, details),
  rateLimited: (retryAfterSeconds: number) =>
    fail(
      'rate_limited',
      `Too many requests. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minutes.`,
      429,
      { retryAfterSeconds }
    ),
  serverError: () =>
    fail('server_error', 'Something went wrong. Please try again.', 500),
};

/**
 * Best-effort client identifier for rate limiting, hashed the same way the
 * browser flow does it.
 */
export async function apiClientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const raw = forwarded
    ? forwarded.split(',')[0].trim()
    : (headerList.get('x-real-ip') ?? 'unknown');

  return createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Applies a per-IP rate limit to an API route.
 *
 * Returns a response to send back when the caller is over budget, or `null`
 * when the request may proceed.
 */
export async function enforceRateLimit(
  prefix: string,
  max: number,
  windowMs: number
): Promise<NextResponse | null> {
  const result = await consume(prefix, { max, windowMs });
  if (!result.allowed) {
    return apiErrors.rateLimited(result.retryAfterSeconds);
  }
  return null;
}

/**
 * Authorises an API request from a session cookie.
 *
 * The browser dashboard uses the same `admin_session` cookie, so a logged-in
 * admin can call the API directly without a separate key.
 */
export async function requireAdminCookie() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}

/**
 * Compares two secrets without leaking their contents through timing.
 */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a, 'utf8').digest();
  const hashB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Authorises an API request from a machine key.
 *
 * `API_KEYS` holds `name:secret` pairs, comma-separated. A request must
 * present the secret in the `Authorization: Bearer` header, or in
 * `x-api-key`. The comparison is constant-time.
 *
 * Returns the key's name when authorised, `null` otherwise.
 */
export async function requireApiKey(): Promise<string | null> {
  const configured = process.env.API_KEYS?.trim();
  if (!configured) return null;

  const headerList = await headers();
  const authorization = headerList.get('authorization');
  const bearer = authorization?.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : null;
  const provided = bearer ?? headerList.get('x-api-key')?.trim() ?? null;

  if (!provided) return null;

  for (const pair of configured.split(',')) {
    const separator = pair.indexOf(':');
    if (separator === -1) continue;

    const name = pair.slice(0, separator).trim();
    const secret = pair.slice(separator + 1).trim();
    if (!name || !secret) continue;

    if (safeEqual(provided, secret)) {
      return name;
    }
  }

  return null;
}

/**
 * Authorises a request by either a session cookie or a machine key.
 *
 * Machine keys are for integrations; the cookie is for the dashboard.
 */
export async function requireAdminOrApiKey(): Promise<
  { kind: 'session' } | { kind: 'key'; name: string } | null
> {
  const keyName = await requireApiKey();
  if (keyName) return { kind: 'key', name: keyName };

  const session = await requireAdminCookie();
  if (session) return { kind: 'session' };

  return null;
}

/**
 * Reads a JSON body, returning `null` when it is absent or malformed.
 */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
