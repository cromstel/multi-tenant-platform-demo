import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMySQLPool } from '@/lib/db/mysql';
import { createTenant, deleteTenant } from '@/lib/db/tenants';
import { verifyPassword } from '@/lib/password';
import { inviteMemberAction, removeMemberAction } from '@/app/admin/members/actions';

/**
 * Member invitation tests against real MySQL.
 *
 * `inviteMemberAction` creates a member with a temporary (scrypt-hashed)
 * password. Last-owner protection is verified via `removeMemberAction`.
 * Duplicate email rejection is verified by inviting the same address twice.
 *
 * The admin session gate, rate limiter, invitation email, and admin path
 * revalidation are mocked; every tenant created is removed in afterAll.
 */

const mockGetAdminSession = vi.hoisted(() =>
  vi.fn(async (): Promise<{ userId: number; email: string; role: string } | null> => ({
    userId: 1,
    email: 'admin@test.local',
    role: 'super_admin',
  }))
);
const mockConsume = vi.hoisted(() =>
  vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60, attemptsLeft: 9 }))
);
const mockSendInvitationEmail = vi.hoisted(() => vi.fn(async () => true));
const mockRevalidateAdmin = vi.hoisted(() => vi.fn());

vi.mock('@/app/auth/admin/login/actions', () => ({ getAdminSession: mockGetAdminSession }));
vi.mock('@/lib/rate-limit', () => ({
  consume: mockConsume,
  CREATE_LIMIT: { max: 10, windowMs: 60 * 60 * 1000 },
}));
vi.mock('@/lib/email', () => ({ sendInvitationEmail: mockSendInvitationEmail }));
vi.mock('@/lib/admin-path', () => ({ revalidateAdmin: mockRevalidateAdmin }));

function formData(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

async function memberByEmail(tenantId: number, email: string) {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT id, email, role, password_hash FROM tenant_users WHERE tenant_id = ? AND email = ?',
    [tenantId, email]
  );
  const arr = rows as Array<{ id: number; email: string; role: string; password_hash: string }>;
  return arr[0] ?? null;
}

const SUBDOMAIN = 'member-invite-test';
const OWNER_EMAIL = `owner@${SUBDOMAIN}.test`;
let tenantId = 0;
let ownerId = 0;

beforeAll(async () => {
  await deleteTenant(SUBDOMAIN).catch(() => undefined);
  const created = await createTenant({
    subdomain: SUBDOMAIN,
    emoji: '👥',
    email: OWNER_EMAIL,
    password: 'Password123',
  });
  expect(created.ok).toBe(true);
  if (!created.ok || !created.tenant) {
    throw new Error('Failed to create test tenant');
  }
  tenantId = created.tenant.id;

  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT id FROM tenant_users WHERE email = ?', [OWNER_EMAIL]);
  ownerId = Number((rows as Array<{ id: number }>)[0]?.id ?? 0);
  expect(ownerId).toBeGreaterThan(0);
});

afterEach(async () => {
  vi.resetAllMocks();
  mockGetAdminSession.mockResolvedValue({
    userId: 1,
    email: 'admin@test.local',
    role: 'super_admin',
  });
  mockConsume.mockResolvedValue({ allowed: true, retryAfterSeconds: 60, attemptsLeft: 9 });
});

afterAll(async () => {
  await deleteTenant(SUBDOMAIN).catch(() => undefined);
});

describe('inviteMemberAction', () => {
  const inviteEmail = `newmember@${SUBDOMAIN}.test`;

  beforeAll(async () => {
    // Clean up any pre-existing member with this email
    const pool = await getMySQLPool();
    await pool.execute('DELETE FROM tenant_users WHERE email = ? AND tenant_id = ?', [inviteEmail, tenantId]);
  });

  it('creates a member with a temporary scrypt-hashed password', async () => {
    const result = await inviteMemberAction(
      {},
      formData([
        ['subdomain', SUBDOMAIN],
        ['email', inviteEmail],
        ['role', 'member'],
      ])
    );

    expect(result.success).toBeDefined();
    expect(result.success).toContain(inviteEmail);
    expect(result.success).toContain('Temporary password:');

    // Extract the temporary password from the success message and verify it
    // hashes to the stored password_hash.
    const tempPassword = result.success?.split('Temporary password: ')[1]?.trim();
    expect(tempPassword).toBeDefined();
    expect(tempPassword!.length).toBeGreaterThan(0);

    const member = await memberByEmail(tenantId, inviteEmail);
    expect(member).not.toBeNull();
    expect(member!.role).toBe('member');
    expect(member!.password_hash.split(':')).toHaveLength(2); // scrypt salt:hash
    expect(await verifyPassword(tempPassword!, member!.password_hash)).toBe(true);
  });

  it('rejects a duplicate email for the same tenant', async () => {
    // First invite should succeed
    const first = await inviteMemberAction(
      {},
      formData([
        ['subdomain', SUBDOMAIN],
        ['email', `dup@${SUBDOMAIN}.test`],
        ['role', 'member'],
      ])
    );
    expect(first.success).toBeDefined();

    // Second invite for the same email should be rejected
    const second = await inviteMemberAction(
      {},
      formData([
        ['subdomain', SUBDOMAIN],
        ['email', `dup@${SUBDOMAIN}.test`],
        ['role', 'member'],
      ])
    );

    expect(second.success).toBeUndefined();
    expect(second.error).toBe('That person is already a member of this tenant.');

    // Clean up the duplicate-invite member
    const pool = await getMySQLPool();
    await pool.execute('DELETE FROM tenant_users WHERE email = ? AND tenant_id = ?', [
      `dup@${SUBDOMAIN}.test`,
      tenantId,
    ]);
  });

  it('returns a session-expired error without a valid admin session', async () => {
    mockGetAdminSession.mockResolvedValue(null);

    const result = await inviteMemberAction(
      {},
      formData([
        ['subdomain', SUBDOMAIN],
        ['email', `nosession@${SUBDOMAIN}.test`],
        ['role', 'member'],
      ])
    );

    expect(result.success).toBeUndefined();
    expect(result.error).toContain('session has expired');
    // No member was created
    const member = await memberByEmail(tenantId, `nosession@${SUBDOMAIN}.test`);
    expect(member).toBeNull();
  });
});

describe('last-owner protection', () => {
  it('prevents removing the only owner of a tenant', async () => {
    const result = await removeMemberAction(
      {},
      formData([
        ['subdomain', SUBDOMAIN],
        ['userId', String(ownerId)],
      ])
    );

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('A tenant must keep at least one owner.');

    // The owner still exists
    const member = await memberByEmail(tenantId, OWNER_EMAIL);
    expect(member).not.toBeNull();
    expect(member!.role).toBe('owner');
  });
});
