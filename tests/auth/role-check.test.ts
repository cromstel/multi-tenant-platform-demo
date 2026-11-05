import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Role-check redirect tests.
 *
 * `requireTenantRole` and `requireAdminRole` delegate to `getTenantSession` /
 * `getAdminSession` and call `next/navigation`'s `redirect` on failure. Those
 * collaborators are mocked here so the redirect *behaviour* is asserted
 * without touching the database, cookies, or the real admin path.
 *
 * `vi.hoisted` is used so the mocks are initialized before the `vi.mock`
 * factories run (vitest hoists `vi.mock` to the top of the file).
 */

const mockRedirect = vi.hoisted(() => vi.fn((url: string) => {
  const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
  error.digest = `NEXT_REDIRECT:${url}`;
  throw error;
}));
const mockGetTenantSession = vi.hoisted(() => vi.fn());
const mockGetAdminSession = vi.hoisted(() => vi.fn());
const mockAdminUrl = vi.hoisted(() => vi.fn((suffix = '') => `/__hidden_admin__${suffix}`));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/app/auth/login/actions', () => ({
  getTenantSession: mockGetTenantSession,
}));

vi.mock('@/app/auth/admin/login/actions', () => ({
  getAdminSession: mockGetAdminSession,
}));

vi.mock('@/lib/admin-path', () => ({
  adminUrl: mockAdminUrl,
}));

import { requireAdminRole, requireTenantRole } from '@/lib/auth/role-check';

beforeEach(() => {
  vi.resetAllMocks();
  mockRedirect.mockImplementation((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireTenantRole', () => {
  it('returns the session when it exists and the role is allowed', async () => {
    const session = {
      userId: 1,
      tenantId: 2,
      email: 'owner@acme.test',
      role: 'owner',
    };
    mockGetTenantSession.mockResolvedValue(session);

    const result = await requireTenantRole(['owner', 'admin']);

    expect(result).toEqual(session);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /auth/login when there is no session', async () => {
    mockGetTenantSession.mockResolvedValue(null);

    await expect(requireTenantRole(['owner'])).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to / when the session role is not allowed', async () => {
    const session = {
      userId: 1,
      tenantId: 2,
      email: 'member@acme.test',
      role: 'member',
    };
    mockGetTenantSession.mockResolvedValue(session);

    await expect(requireTenantRole(['owner', 'admin'])).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});

describe('requireAdminRole', () => {
  it('returns the session when it exists and the role is allowed', async () => {
    const session = {
      userId: 1,
      email: 'admin@test.local',
      role: 'super_admin',
    };
    mockGetAdminSession.mockResolvedValue(session);

    const result = await requireAdminRole(['super_admin']);

    expect(result).toEqual(session);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to the hidden admin login when there is no session', async () => {
    mockGetAdminSession.mockResolvedValue(null);

    await expect(requireAdminRole(['super_admin'])).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith('/__hidden_admin__/login');
  });

  it('redirects to / when the session role is not allowed', async () => {
    const session = {
      userId: 1,
      email: 'admin@test.local',
      role: 'admin',
    };
    mockGetAdminSession.mockResolvedValue(session);

    await expect(requireAdminRole(['super_admin'])).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});
