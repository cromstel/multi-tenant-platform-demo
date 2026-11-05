import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '@/lib/password';

/**
 * Admin login action tests.
 *
 * The full login flow touches MySQL, the rate-limit store, cookies, the
 * redirect helper and `adminUrl()`, so those boundaries are mocked. The tests
 * assert input validation and the credential-verification decision (valid vs
 * invalid) — no real database or secret is required. `issueSession` is mocked
 * here because `AUTH_JWT_SECRET` is not part of the test env.
 *
 * `vi.hoisted` is used so the mocks are initialized before the `vi.mock`
 * factories run (vitest hoists `vi.mock` to the top of the file).
 */

const setCookie = vi.hoisted(() => vi.fn());
const getCookie = vi.hoisted(() =>
  vi.fn(() => undefined as { value: string | undefined } | undefined)
);
let cookieStore: { set: typeof setCookie; get: typeof getCookie };

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  })
);
const mockExecute = vi.hoisted(() => vi.fn());
const mockCheck = vi.hoisted(() => vi.fn());
const mockConsume = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());
const mockIssueSession = vi.hoisted(() => vi.fn());
const mockAdminUrl = vi.hoisted(() => vi.fn((suffix = '') => `/__hidden_admin__${suffix}`));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
  headers: vi.fn(() => ({ get: () => null })),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/lib/db/mysql', () => ({
  getMySQLPool: vi.fn(async () => ({ execute: mockExecute })),
}));

vi.mock('@/lib/rate-limit', () => ({
  LOGIN_LIMIT: { max: 5, windowMs: 15 * 60 * 1000 },
  check: mockCheck,
  consume: mockConsume,
  reset: mockReset,
}));

vi.mock('@/lib/auth/jwt', () => ({
  issueSession: mockIssueSession,
}));

vi.mock('@/lib/admin-path', () => ({
  adminUrl: mockAdminUrl,
}));

import type { LoginState } from '@/app/auth/admin/login/actions';
import { getAdminSession, loginAction } from '@/app/auth/admin/login/actions';

beforeEach(() => {
  vi.resetAllMocks();
  cookieStore = { set: setCookie, get: getCookie };
  mockIssueSession.mockResolvedValue('mock-auth-cookie');
  mockCheck.mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 60,
    attemptsLeft: 4,
  });
  mockConsume.mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 60,
    attemptsLeft: 4,
  });
  mockReset.mockResolvedValue(undefined);
  mockAdminUrl.mockReturnValue('/__hidden_admin__');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAdminSession', () => {
  it('returns null without a session cookie', async () => {
    getCookie.mockReturnValue(undefined);

    const session = await getAdminSession();

    expect(session).toBeNull();
  });
});

describe('loginAction', () => {
  const baseFormData = () => {
    const formData = new FormData();
    formData.append('email', 'admin@test.local');
    formData.append('password', 'test-admin-password');
    return formData;
  };

  it('returns an error when email is missing', async () => {
    const formData = new FormData();
    formData.append('password', 'test-admin-password');

    const result: LoginState = await loginAction({}, formData);

    expect(result).toEqual({ error: 'Email and password are required' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returns an error when password is missing', async () => {
    const formData = new FormData();
    formData.append('email', 'admin@test.local');

    const result: LoginState = await loginAction({}, formData);

    expect(result).toEqual({ error: 'Email and password are required' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returns an error when both email and password are missing', async () => {
    const formData = new FormData();

    const result: LoginState = await loginAction({}, formData);

    expect(result).toEqual({ error: 'Email and password are required' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to the admin dashboard on valid credentials', async () => {
    const passwordHash = await hashPassword('test-admin-password');
    mockExecute.mockResolvedValue([
      [
        {
          id: 1,
          email: 'admin@test.local',
          password_hash: passwordHash,
          role: 'super_admin',
        },
      ],
      [],
    ]);

    await expect(loginAction({}, baseFormData())).rejects.toThrow();

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/__hidden_admin__');
    expect(setCookie).toHaveBeenCalledTimes(2);
    expect(mockIssueSession).toHaveBeenCalled();
  });

  it('returns an error on invalid credentials', async () => {
    mockExecute.mockResolvedValue([[], []]);

    const formData = new FormData();
    formData.append('email', 'wrong@test.local');
    formData.append('password', 'wrong-password');

    const result: LoginState = await loginAction({}, formData);

    expect(result.error).toContain('Invalid credentials');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('returns an error when no active user matches', async () => {
    mockExecute.mockResolvedValue([[], []]);

    const formData = new FormData();
    formData.append('email', 'admin@test.local');
    formData.append('password', 'test-admin-password');

    const result: LoginState = await loginAction({}, formData);

    expect(result.error).toContain('Invalid credentials');
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
