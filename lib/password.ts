import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing, in one place.
 *
 * Three separate modules were hashing passwords independently, each with its
 * own copy of the salt-and-compare logic. That made it easy for two of them
 * to drift, and impossible to upgrade the algorithm in one edit.
 *
 * The stored format is `salt:hash` — a 32-byte random salt, then SHA-256 over
 * `password + salt`. Both are hex encoded.
 *
 * SHA-256 is salted and compared in constant time, but it is not
 * memory-hard, so it is weaker against offline cracking than a dedicated KDF.
 * `hashPassword` is the single seam where switching to scrypt or argon2
 * happens — see `SECURITY.md`.
 */

const SALT_BYTES = 16;

/** Hashes a password with a fresh random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored `salt:hash` pair.
 *
 * Returns `false` for a malformed stored value rather than throwing — a
 * corrupt row must not crash the login endpoint.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;

  const [salt, hash] = parts;
  if (!salt || !hash) return false;

  const computed = createHash('sha256').update(password + salt).digest('hex');
  return safeEqual(computed, hash);
}

/**
 * Compares two strings without leaking their contents through timing.
 *
 * Both sides are hashed first so the buffers are always the same length —
 * `timingSafeEqual` throws otherwise, and differing lengths would otherwise
 * short-circuit before the comparison.
 */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a, 'utf8').digest();
  const hashB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(hashA, hashB);
}

/** A constant-length hash of a value, safe to use as a key. */
export function hashKey(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
