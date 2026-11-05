import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getMySQLPool } from '@/lib/db/mysql';
import { createTenant, deleteTenant } from '@/lib/db/tenants';
import { verifyPassword } from '@/lib/password';
import { resetRequestAction, verifyResetTokenAction } from '@/app/auth/reset/actions';

/**
 * Integration tests for the password-reset Server Actions against real MySQL.
 *
 * A tenant and its owner are created once in `beforeAll`. Reset tokens are
 * cleared after each test so every verify case starts from a clean token
 * table; the tenant is removed in `afterAll`.
 */

const subdomain = 'taction-reset';
const email = `owner@${subdomain}.test`;
let uid = 0;

function formData(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

async function tokenForUser(userId: number): Promise<string | null> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT token FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  const arr = rows as Array<{ token: string }>;
  return arr.length ? arr[0].token : null;
}

async function tokenCount(token: string): Promise<number> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM password_reset_tokens WHERE token = ?', [token]);
  return Number((rows as Array<{ c: number }>)[0].c);
}

async function passwordHash(userId: number): Promise<string | null> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT password_hash FROM tenant_users WHERE id = ?', [userId]);
  const arr = rows as Array<{ password_hash: string }>;
  return arr.length ? arr[0].password_hash : null;
}

beforeAll(async () => {
  await deleteTenant(subdomain).catch(() => undefined);
  const created = await createTenant({ subdomain, emoji: '🔑', email, password: 'Password123' });
  expect(created.ok).toBe(true);

  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT id FROM tenant_users WHERE email = ? LIMIT 1', [email]);
  uid = Number((rows as Array<{ id: number }>)[0]?.id ?? 0);
  expect(uid).toBeGreaterThan(0);
});

afterEach(async () => {
  const pool = await getMySQLPool();
  await pool.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [uid]).catch(() => undefined);
});

afterAll(async () => {
  await deleteTenant(subdomain).catch(() => undefined);
});

describe('resetRequestAction', () => {
  it('generates and stores a token for an existing email', async () => {
    const result = await resetRequestAction({}, formData([['email', email]]));

    expect(result.success).toBe(true);

    const token = await tokenForUser(uid);
    expect(token).not.toBeNull();
    expect(await tokenCount(token!)).toBe(1);
  });

  it('returns success without revealing whether an unknown email exists', async () => {
    const result = await resetRequestAction({}, formData([['email', 'no-such-user@example.invalid']]));

    expect(result.success).toBe(true);
    // No token was created for the known user by this call.
    expect(await tokenForUser(uid)).toBeNull();
  });
});

describe('verifyResetTokenAction', () => {
  it('verifies a valid token and returns the owning user', async () => {
    await resetRequestAction({}, formData([['email', email]]));
    const token = await tokenForUser(uid);
    expect(token).not.toBeNull();

    const result = await verifyResetTokenAction(token!);

    expect(result.success).toBe(true);
    expect(result.user).toBe(uid);
    // Verification without a new password does not invalidate the token.
    expect(await tokenCount(token!)).toBe(1);
  });

  it('rejects a token that does not exist', async () => {
    const result = await verifyResetTokenAction('does-not-exist-token');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or expired token');
  });

  it('rejects an expired token and removes it from the store', async () => {
    const pool = await getMySQLPool();
    await pool.execute(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      ['expired-reset-token', uid, Date.now() - 10000]
    );

    const result = await verifyResetTokenAction('expired-reset-token');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Token has expired');
    expect(await tokenCount('expired-reset-token')).toBe(0);
  });

  it('sets a new password, hashes it, and invalidates the token', async () => {
    await resetRequestAction({}, formData([['email', email]]));
    const token = await tokenForUser(uid);
    expect(token).not.toBeNull();

    const result = await verifyResetTokenAction(
      formData([['token', token!], ['new-password', 'NewPassword123']])
    );

    expect(result.success).toBe(true);

    const hash = await passwordHash(uid);
    expect(hash).not.toBeNull();
    expect(await verifyPassword('NewPassword123', hash!)).toBe(true);
    expect(await verifyPassword('wrong-password', hash!)).toBe(false);
    expect(await tokenCount(token!)).toBe(0);
  });

  it('rejects a new password shorter than 8 characters and keeps the token', async () => {
    await resetRequestAction({}, formData([['email', email]]));
    const token = await tokenForUser(uid);
    expect(token).not.toBeNull();

    const result = await verifyResetTokenAction(
      formData([['token', token!], ['new-password', 'short']])
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters');
    expect(await tokenCount(token!)).toBe(1);
  });
});
