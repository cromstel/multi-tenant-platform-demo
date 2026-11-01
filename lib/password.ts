import 'server-only';

import { createHash, randomBytes, timingSafeEqual, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

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

/** Memory-hard KDF (scrypt) with random salt. Stored as `salt:hash` hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
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

  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;

  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  const storedHash = Buffer.from(hashHex, 'hex');
  if (storedHash.length !== hash.length) return false;
  return timingSafeEqual(hash, storedHash);
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
