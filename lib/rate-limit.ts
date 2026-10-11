import 'server-only';

import { headers } from 'next/headers';

/**
 * Fixed-window rate limiting for the admin login endpoint.
 *
 * An unauthenticated login form is trivially brute-forceable without this.
 *
 * IMPORTANT: state lives in-process memory, so limits reset when the server
 * restarts and are **per instance** — on a multi-instance or serverless
 * deployment every instance keeps its own counters. Move this to Redis (the
 * same `KvClient` interface used for tenant data) before exposing admin login
 * to real traffic.
 */

type Bucket = {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
};

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // failures expire after 15 minutes
const LOCK_MS = 15 * 60 * 1000; // lockout after too many failures

// Stored on globalThis so dev-server hot reloads do not reset the counters.
const globalForLimiter = globalThis as unknown as {
  __loginLimiter?: Map<string, Bucket>;
};

const buckets = (globalForLimiter.__loginLimiter ??= new Map<string, Bucket>());

/**
 * Best-effort client identifier.
 *
 * These headers are only trustworthy when the app sits behind a proxy that
 * overwrites them. A direct-to-internet deployment lets a caller spoof them,
 * so treat this as a weak signal that raises the cost of guessing rather than
 * a real access control.
 */
export async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return headerList.get('x-real-ip') ?? 'unknown';
}

function getBucket(key: string): Bucket {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.firstFailureAt > WINDOW_MS) {
    const fresh: Bucket = {
      failures: 0,
      firstFailureAt: now,
      lockedUntil: 0
    };
    buckets.set(key, fresh);
    return fresh;
  }

  return existing;
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** Failed attempts still permitted before lockout. */
  attemptsLeft: number;
};

/** Whether another login attempt is currently permitted for this client. */
export async function checkLoginRateLimit(): Promise<RateLimitResult> {
  const key = await getClientIdentifier();
  const bucket = getBucket(key);
  const remaining = bucket.lockedUntil - Date.now();

  if (remaining > 0) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(remaining / 1000),
      attemptsLeft: 0
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    attemptsLeft: MAX_FAILURES - bucket.failures
  };
}

/** Records a failed attempt; locks the client out once the limit is hit. */
export async function recordLoginFailure(): Promise<RateLimitResult> {
  const key = await getClientIdentifier();
  const bucket = getBucket(key);

  bucket.failures += 1;

  if (bucket.failures >= MAX_FAILURES) {
    bucket.lockedUntil = Date.now() + LOCK_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(LOCK_MS / 1000),
      attemptsLeft: 0
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    attemptsLeft: MAX_FAILURES - bucket.failures
  };
}

/** Clears the counter after a successful login. */
export async function clearLoginFailures(): Promise<void> {
  buckets.delete(await getClientIdentifier());
}