import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redis } from '@/lib/redis';

/**
 * Fixed-window rate limiting, backed by the same `KvClient` as tenant data.
 *
 * Counters live in the configured store, so the limits hold across every
 * instance of a multi-instance or serverless deployment rather than resetting
 * per process. `incr` is atomic, so concurrent attempts cannot lose a count.
 *
 * The window is derived from the clock and encoded in the key, and each key
 * carries a TTL. That keeps the key space bounded without needing a sweep.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the current window ends. */
  retryAfterSeconds: number;
  /** Attempts still permitted before the limit is hit. */
  attemptsLeft: number;
};

/**
 * Best-effort client identifier.
 *
 * These headers are only trustworthy when the app sits behind a proxy that
 * overwrites them. A direct-to-internet deployment lets a caller spoof them,
 * so this raises the cost of abuse rather than acting as an access control.
 * Point it at an address your platform guarantees if you need a hard bound.
 *
 * The value is hashed before use: a spoofed header could otherwise be
 * arbitrarily long, or contain the `:` delimiter and forge a key that collides
 * with a different namespace.
 */
export async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const raw = forwarded
    ? forwarded.split(',')[0].trim()
    : (headerList.get('x-real-ip') ?? 'unknown');

  return createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 16);
}

/** 5 failed admin logins per IP per 15 minutes. */
export const LOGIN_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

/** 10 tenant creations per IP per hour. */
export const CREATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

type Window = {
  key: string;
  retryAfterSeconds: number;
};

function currentWindow(prefix: string, identifier: string, windowMs: number): Window {
  const now = Date.now();
  const windowIndex = Math.floor(now / windowMs);
  const windowEnd = (windowIndex + 1) * windowMs;

  return {
    key: `ratelimit:${prefix}:${identifier}:${windowIndex}`,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000))
  };
}

/** Reads the current count without changing it. */
async function peek(
  prefix: string,
  identifier: string,
  limit: { max: number; windowMs: number }
): Promise<RateLimitResult> {
  const { key, retryAfterSeconds } = currentWindow(prefix, identifier, limit.windowMs);
  const count = (await redis.get<number>(key)) ?? 0;

  return {
    allowed: count < limit.max,
    retryAfterSeconds,
    attemptsLeft: Math.max(0, limit.max - count)
  };
}

/**
 * Counts one attempt against the limit and reports whether it was allowed.
 *
 * Call this *before* performing the guarded operation: it must consume an
 * attempt whether or not the attempt succeeds.
 */
export async function consume(
  prefix: string,
  limit: { max: number; windowMs: number }
): Promise<RateLimitResult> {
  const identifier = await getClientIdentifier();
  const { key, retryAfterSeconds } = currentWindow(prefix, identifier, limit.windowMs);

  const count = await redis.incr(key);

  // Only the first hit in a window needs a TTL.
  if (count === 1) {
    await redis.expire(key, Math.ceil(limit.windowMs / 1000) + 60);
  }

  return {
    allowed: count <= limit.max,
    retryAfterSeconds,
    attemptsLeft: Math.max(0, limit.max - count)
  };
}

/** Checks the limit without consuming an attempt. */
export async function check(
  prefix: string,
  limit: { max: number; windowMs: number }
): Promise<RateLimitResult> {
  return peek(prefix, await getClientIdentifier(), limit);
}

/** Clears the counter after a successful login. */
export async function reset(prefix: string): Promise<void> {
  const identifier = await getClientIdentifier();
  const windowMs = prefix === 'login' ? LOGIN_LIMIT.windowMs : CREATE_LIMIT.windowMs;
  const { key } = currentWindow(prefix, identifier, windowMs);
  await redis.del(key);
}