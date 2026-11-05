import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMySQLPool } from '@/lib/db/mysql';
import { createTenant, deleteTenant, getTenantBySubdomain } from '@/lib/db/tenants';
import type { BulkDeleteState, CreateSubdomainState, DeleteSubdomainState } from '@/app/actions';
import { createSubdomainAction, deleteSubdomainAction, bulkDeleteSubdomainsAction } from '@/app/actions';

/**
 * Integration tests for the tenant Server Actions against real MySQL.
 *
 * `createSubdomainAction`, `deleteSubdomainAction` and
 * `bulkDeleteSubdomainsAction` all write to the live database. The admin
 * session gate, the rate limiter, the router redirect and the admin path
 * revalidation are mocked so each test is deterministic; every tenant created
 * is removed in `afterEach`.
 */

const PREFIX = 'taction';
const toClean: string[] = [];

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  })
);

const mockConsume = vi.hoisted(() =>
  vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60, attemptsLeft: 9 }))
);

const mockGetAdminSession = vi.hoisted(() =>
  vi.fn(async (): Promise<{ userId: number; email: string; role: string } | null> => ({
    userId: 1,
    email: 'admin@test.local',
    role: 'super_admin',
  }))
);

const mockRevalidateAdmin = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/rate-limit', () => ({
  consume: mockConsume,
  CREATE_LIMIT: { max: 10, windowMs: 60 * 60 * 1000 },
  LOGIN_LIMIT: { max: 5, windowMs: 15 * 60 * 1000 },
}));
vi.mock('@/app/auth/admin/login/actions', () => ({ getAdminSession: mockGetAdminSession }));
vi.mock('@/lib/admin-path', () => ({ revalidateAdmin: mockRevalidateAdmin }));

function formData(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

async function tenantCount(subdomain: string): Promise<number> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM tenants WHERE subdomain = ?', [subdomain]);
  return Number((rows as Array<{ c: number }>)[0].c);
}

afterEach(async () => {
  for (const subdomain of toClean) {
    await deleteTenant(subdomain).catch(() => undefined);
  }
  toClean.length = 0;
  vi.resetAllMocks();
  mockConsume.mockResolvedValue({ allowed: true, retryAfterSeconds: 60, attemptsLeft: 9 });
  mockGetAdminSession.mockResolvedValue({
    userId: 1,
    email: 'admin@test.local',
    role: 'super_admin',
  });
});

describe('createSubdomainAction', () => {
  const subdomain = `${PREFIX}-create`;
  const email = `owner@${subdomain}.test`;

  beforeAll(async () => {
    await deleteTenant(subdomain).catch(() => undefined);
    toClean.push(subdomain);
  });

  afterAll(async () => {
    await deleteTenant(subdomain).catch(() => undefined);
  });

  it('creates a tenant row and redirects to the tenant URL', async () => {
    await expect(
      createSubdomainAction({}, formData([['subdomain', subdomain], ['icon', '🧪']]))
    ).rejects.toThrow();

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(await tenantCount(subdomain)).toBe(1);

    const tenant = await getTenantBySubdomain(subdomain);
    expect(tenant).not.toBeNull();
    expect(tenant?.emoji).toBe('🧪');
  });

  it('rejects a subdomain containing disallowed characters', async () => {
    const result: CreateSubdomainState = await createSubdomainAction(
      {},
      formData([['subdomain', 'Bad Name'], ['icon', '🧪']])
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('lowercase letters, numbers, and hyphens');
    expect(await tenantCount('bad-name')).toBe(0);
  });

  it('rejects a duplicate subdomain', async () => {
    await createTenant({ subdomain, emoji: '🧪', email, password: 'Password123' });

    const result: CreateSubdomainState = await createSubdomainAction(
      {},
      formData([['subdomain', subdomain], ['icon', '🧪']])
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('This subdomain is already taken');
    expect(await tenantCount(subdomain)).toBe(1);
  });
});

describe('deleteSubdomainAction', () => {
  const subdomain = `${PREFIX}-delete`;

  beforeAll(async () => {
    await deleteTenant(subdomain).catch(() => undefined);
    toClean.push(subdomain);
  });

  it('deletes an existing tenant when the admin session is valid', async () => {
    await createTenant({ subdomain, emoji: '🗑️', email: `owner@${subdomain}.test`, password: 'Password123' });
    expect(await tenantCount(subdomain)).toBe(1);

    const result: DeleteSubdomainState = await deleteSubdomainAction(
      {},
      formData([['subdomain', subdomain]])
    );

    expect(result.success).toBe('Domain deleted successfully');
    expect(mockRevalidateAdmin).toHaveBeenCalledTimes(1);
    expect(await tenantCount(subdomain)).toBe(0);
  });

  it('returns a session-expired error without a valid admin session', async () => {
    mockGetAdminSession.mockResolvedValue(null);
    const ghost = `${PREFIX}-delete-session`;
    await createTenant({ subdomain: ghost, emoji: '🗑️', email: `owner@${ghost}.test`, password: 'Password123' });
    toClean.push(ghost);

    const result = await deleteSubdomainAction({}, formData([['subdomain', ghost]]));

    expect(result.success).toBeUndefined();
    expect(result.error).toContain('session has expired');
    expect(await tenantCount(ghost)).toBe(1);
  });

  it('requires a subdomain', async () => {
    const result = await deleteSubdomainAction({}, formData([]));

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('A subdomain is required');
  });

  it('returns not-found when the tenant is already gone', async () => {
    const missing = `${PREFIX}-ghost`;
    await deleteTenant(missing).catch(() => undefined);

    const result = await deleteSubdomainAction({}, formData([['subdomain', missing]]));

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('That tenant no longer exists.');
  });
});

describe('bulkDeleteSubdomainsAction', () => {
  const base = `${PREFIX}-bulk`;

  async function seed(names: string[]) {
    for (const s of names) {
      await deleteTenant(s).catch(() => undefined);
      await createTenant({ subdomain: s, emoji: '📦', email: `owner@${s}.test`, password: 'Password123' });
      toClean.push(s);
    }
  }

  it('deletes all selected tenants and reports the count', async () => {
    const names = [`${base}-1`, `${base}-2`, `${base}-3`];
    await seed(names);

    for (const s of names) expect(await tenantCount(s)).toBe(1);

    const result: BulkDeleteState = await bulkDeleteSubdomainsAction(
      {},
      formData(names.map((s) => ['subdomains', s]))
    );

    expect(result.success).toContain('3 tenants deleted successfully');
    expect(result.count).toBe(3);
    expect(mockRevalidateAdmin).toHaveBeenCalledTimes(1);
    for (const s of names) expect(await tenantCount(s)).toBe(0);
  });

  it('requires at least one selected subdomain', async () => {
    const result = await bulkDeleteSubdomainsAction({}, formData([]));

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Select at least one tenant to delete.');
  });

  it('returns a session-expired error without a valid admin session', async () => {
    mockGetAdminSession.mockResolvedValue(null);
    const names = [`${base}-x`];
    await seed(names);

    const result = await bulkDeleteSubdomainsAction(
      {},
      formData(names.map((s) => ['subdomains', s]))
    );

    expect(result.success).toBeUndefined();
    expect(result.error).toContain('session has expired');
    expect(await tenantCount(`${base}-x`)).toBe(1);
  });

  it('ignores subdomains that do not exist', async () => {
    const existing = `${base}-exist`;
    await seed([existing]);

    const result = await bulkDeleteSubdomainsAction(
      {},
      formData([
        ['subdomains', existing],
        ['subdomains', 'does-not-exist'],
      ])
    );

    expect(result.count).toBe(1);
    expect(await tenantCount(existing)).toBe(0);
    expect(await tenantCount('does-not-exist')).toBe(0);
  });

  afterAll(async () => {
    for (const s of [`${base}-1`, `${base}-2`, `${base}-3`, `${base}-x`, `${base}-exist`]) {
      await deleteTenant(s).catch(() => undefined);
    }
  });
});
