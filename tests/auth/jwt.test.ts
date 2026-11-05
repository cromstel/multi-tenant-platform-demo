import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * JWT session tests.
 *
 * `VERIFY_SECRET` in `lib/auth/jwt.ts` is captured from `process.env.AUTH_JWT_SECRET`
 * at module load time, so each test reloads the module with the desired secret
 * (or none) via `vi.resetModules()` + dynamic import. This keeps the
 * fail-closed behaviour deterministic regardless of test order.
 */

const TEST_SECRET = 'test-only-jwt-secret-for-testing-do-not-use-in-production';

async function importJwt(withSecret: boolean) {
  if (withSecret) {
    process.env.AUTH_JWT_SECRET = TEST_SECRET;
  } else {
    delete process.env.AUTH_JWT_SECRET;
  }
  vi.resetModules();
  return import('@/lib/auth/jwt');
}

afterEach(() => {
  delete process.env.AUTH_JWT_SECRET;
});

describe('issueSession', () => {
  it('returns a string token when AUTH_JWT_SECRET is set', async () => {
    const mod = await importJwt(true);
    const token = await mod.issueSession({ sub: 'user-1', role: 'admin' });

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('throws when AUTH_JWT_SECRET is unset', async () => {
    const mod = await importJwt(false);

    await expect(mod.issueSession({ sub: 'user-1' })).rejects.toThrow(
      'AUTH_JWT_SECRET is not set'
    );
  });
});

describe('verifyToken', () => {
  let token: string;

  beforeEach(async () => {
    const mod = await importJwt(true);
    token = await mod.issueSession({ sub: 'user-1', role: 'admin', tenantId: 7 });
  });

  it('returns the payload for a valid token', async () => {
    const mod = await importJwt(true);
    const payload = await mod.verifyToken(token);

    expect(payload).toMatchObject({ sub: 'user-1', role: 'admin', tenantId: 7 });
  });

  it('returns null for a tampered token', async () => {
    const mod = await importJwt(true);
    const tampered = token.slice(0, -1) + (token.endsWith('=') ? 'a' : '=');

    const payload = await mod.verifyToken(tampered);
    expect(payload).toBeNull();
  });

  it('returns null for malformed tokens', async () => {
    const mod = await importJwt(true);

    await expect(mod.verifyToken('not.a.jwt')).resolves.toBeNull();
    await expect(mod.verifyToken('')).resolves.toBeNull();
  });

  it('returns null when AUTH_JWT_SECRET is unset (fail closed)', async () => {
    const mod = await importJwt(false);

    await expect(mod.verifyToken(token)).resolves.toBeNull();
  });

  it('returns null when the token was signed with a different secret', async () => {
    const modA = await importJwt(true);
    const tokenA = await modA.issueSession({ sub: 'user-1' });

    process.env.AUTH_JWT_SECRET = 'different-test-secret-do-not-use';
    vi.resetModules();
    const modB = await import('@/lib/auth/jwt');

    await expect(modB.verifyToken(tokenA)).resolves.toBeNull();
    delete process.env.AUTH_JWT_SECRET;
  });
});
