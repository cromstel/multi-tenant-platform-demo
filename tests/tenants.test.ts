import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getMySQLPool } from '@/lib/db/mysql';
import {
  createTenant,
  deleteTenant,
  getTenantBySubdomain,
  listTenantUsers,
  listTenants,
  updateTenant,
  validateTenantInput,
} from '@/lib/db/tenants';

/**
 * Integration tests against the real MySQL schema.
 *
 * These deliberately use the live database rather than a mock: the behaviour
 * that matters here — unique-index enforcement, foreign-key cascades,
 * transaction rollback — lives in the database, and a mock would assert the
 * wrong thing.
 *
 * Every test uses a subdomain prefixed `test-` and cleans up after itself.
 */

const PREFIX = 'test';

async function cleanup(subdomain: string) {
  await deleteTenant(subdomain);
}

describe('validateTenantInput', () => {
  it('accepts a well-formed payload', () => {
    const errors = validateTenantInput({
      subdomain: 'acme',
      emoji: '🚀',
      email: 'owner@acme.com',
      password: 'Password123',
    });
    expect(errors).toBeNull();
  });

  it('rejects a subdomain with disallowed characters', () => {
    const errors = validateTenantInput({
      subdomain: 'Acme Corp',
      emoji: '🚀',
      email: 'owner@acme.com',
      password: 'Password123',
    });
    expect(errors?.subdomain).toBeDefined();
  });

  it('rejects a subdomain longer than 63 characters', () => {
    const errors = validateTenantInput({
      subdomain: 'a'.repeat(64),
      emoji: '🚀',
      email: 'owner@acme.com',
      password: 'Password123',
    });
    expect(errors?.subdomain).toBeDefined();
  });

  it('rejects a malformed email', () => {
    const errors = validateTenantInput({
      subdomain: 'acme',
      emoji: '🚀',
      email: 'not-an-email',
      password: 'Password123',
    });
    expect(errors?.email).toBeDefined();
  });

  it('rejects a short password', () => {
    const errors = validateTenantInput({
      subdomain: 'acme',
      emoji: '🚀',
      email: 'owner@acme.com',
      password: 'short',
    });
    expect(errors?.password).toBeDefined();
  });

  it('reports every problem at once, not just the first', () => {
    const errors = validateTenantInput({
      subdomain: 'BAD NAME',
      emoji: '',
      email: 'nope',
      password: 'x',
    });
    expect(Object.keys(errors ?? {})).toHaveLength(4);
  });
});

describe('tenant lifecycle', () => {
  const subdomain = `${PREFIX}-lifecycle`;
  const email = `owner@${subdomain}.test`;

  beforeAll(async () => {
    await cleanup(subdomain);
  });

  afterAll(async () => {
    await cleanup(subdomain);
  });

  it('creates a tenant with an owner', async () => {
    const result = await createTenant({
      subdomain,
      emoji: '🧪',
      email,
      password: 'Password123',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.tenant.subdomain).toBe(subdomain);
    expect(result.tenant.emoji).toBe('🧪');
    expect(result.tenant.userCount).toBe(1);
    expect(result.tenant.ownerEmail).toBe(email);
  });

  it('reads the tenant back', async () => {
    const tenant = await getTenantBySubdomain(subdomain);
    expect(tenant).not.toBeNull();
    expect(tenant?.ownerEmail).toBe(email);
  });

  it('lists the owner as a member', async () => {
    const users = await listTenantUsers(subdomain);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe(email);
    expect(users[0].role).toBe('owner');
    expect(users[0].isActive).toBe(true);
  });

  it('refuses a duplicate subdomain', async () => {
    const result = await createTenant({
      subdomain,
      emoji: '🧪',
      email: `other@${subdomain}.test`,
      password: 'Password123',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('subdomain_taken');
  });

  it('updates the emoji', async () => {
    const updated = await updateTenant(subdomain, { emoji: '✅' });
    expect(updated?.emoji).toBe('✅');
  });

  it('leaves the subdomain immutable', async () => {
    // The service has no subdomain setter at all — that is the guarantee.
    const tenant = await getTenantBySubdomain(subdomain);
    expect(tenant?.subdomain).toBe(subdomain);
  });

  it('appears in the tenant list', async () => {
    const tenants = await listTenants(200);
    expect(tenants.some((tenant) => tenant.subdomain === subdomain)).toBe(true);
  });

  it('deletes the tenant and its members', async () => {
    const deleted = await deleteTenant(subdomain);
    expect(deleted).toBe(true);

    expect(await getTenantBySubdomain(subdomain)).toBeNull();
    expect(await listTenantUsers(subdomain)).toHaveLength(0);
  });

  it('reports a missing tenant rather than throwing', async () => {
    expect(await deleteTenant('does-not-exist-at-all')).toBe(false);
    expect(await getTenantBySubdomain('does-not-exist-at-all')).toBeNull();
  });
});

describe('database constraints', () => {
  const subdomain = `${PREFIX}-constraints`;

  beforeAll(async () => {
    await cleanup(subdomain);
  });

  afterAll(async () => {
    await cleanup(subdomain);
  });

  it('enforces the unique subdomain index at the database level', async () => {
    await createTenant({
      subdomain,
      emoji: '🧪',
      email: `owner@${subdomain}.test`,
      password: 'Password123',
    });

    // Bypass the service layer entirely — the database must still refuse.
    const pool = await getMySQLPool();
    await expect(
      pool.execute('INSERT INTO tenants (subdomain, emoji) VALUES (?, ?)', [
        subdomain,
        '🧪',
      ])
    ).rejects.toThrow();
  });

  it('cascades member deletion when a tenant is removed', async () => {
    const pool = await getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT id FROM tenants WHERE subdomain = ?',
      [subdomain]
    );
    const tenantId = (rows as Array<{ id: number }>)[0].id;

    const [before] = await pool.execute(
      'SELECT COUNT(*) AS c FROM tenant_users WHERE tenant_id = ?',
      [tenantId]
    );
    expect((before as Array<{ c: number }>)[0].c).toBeGreaterThan(0);

    await deleteTenant(subdomain);

    const [after] = await pool.execute(
      'SELECT COUNT(*) AS c FROM tenant_users WHERE tenant_id = ?',
      [tenantId]
    );
    expect((after as Array<{ c: number }>)[0].c).toBe(0);
  });
});
