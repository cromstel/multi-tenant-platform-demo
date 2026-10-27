import 'server-only';

import { getMySQLPool } from '@/lib/db/mysql';
import { isValidIcon, sanitizeSubdomain } from '@/lib/subdomains';

/**
 * Tenant operations shared by the JSON API and the Server Actions.
 *
 * Both entry points need the same validation and the same writes — a tenant
 * created through one must be indistinguishable from a tenant created through
 * the other. Keeping the logic here means there is exactly one place where
 * the rules live.
 */

export type TenantRecord = {
  id: number;
  subdomain: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  ownerEmail: string | null;
};

export type CreateTenantInput = {
  subdomain: string;
  emoji: string;
  email: string;
  password: string;
};

export type CreateTenantResult =
  | { ok: true; tenant: TenantRecord }
  | { ok: false; code: string; message: string; details?: unknown };

/** Maximum length of a tenant subdomain. */
export const MAX_SUBDOMAIN_LENGTH = 63;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 255;
}

/**
 * Validates a tenant payload.
 *
 * Returns a map of field errors, or `null` when everything is acceptable.
 */
export function validateTenantInput(input: {
  subdomain?: unknown;
  emoji?: unknown;
  email?: unknown;
  password?: unknown;
}): Record<string, string> | null {
  const errors: Record<string, string> = {};

  const subdomain = typeof input.subdomain === 'string' ? input.subdomain : '';
  if (!subdomain) {
    errors.subdomain = 'A subdomain is required.';
  } else if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
    errors.subdomain = `A subdomain may be at most ${MAX_SUBDOMAIN_LENGTH} characters.`;
  } else if (sanitizeSubdomain(subdomain) !== subdomain) {
    errors.subdomain =
      'A subdomain may only contain lowercase letters, numbers and hyphens.';
  }

  const emoji = typeof input.emoji === 'string' ? input.emoji : '';
  if (!emoji) {
    errors.emoji = 'An icon is required.';
  } else if (!isValidIcon(emoji)) {
    errors.emoji = 'The icon must be an emoji of at most 10 characters.';
  }

  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!email) {
    errors.email = 'An email address is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'That does not look like an email address.';
  }

  const password = typeof input.password === 'string' ? input.password : '';
  if (!password) {
    errors.password = 'A password is required.';
  } else if (password.length < 8) {
    errors.password = 'A password must be at least 8 characters.';
  } else if (password.length > 200) {
    errors.password = 'A password may be at most 200 characters.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Creates a tenant and its owner in one transaction.
 *
 * A tenant without an owner is unreachable and unmanageable, so both rows are
 * written together or neither is.
 */
export async function createTenant(
  input: CreateTenantInput
): Promise<CreateTenantResult> {
  const subdomain = input.subdomain;
  const email = input.email.trim().toLowerCase();

  const pool = await getMySQLPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [existing] = await conn.execute(
      'SELECT id FROM tenants WHERE subdomain = ?',
      [subdomain]
    );

    if ((existing as Array<{ id: number }>).length > 0) {
      await conn.rollback();
      return {
        ok: false,
        code: 'subdomain_taken',
        message: 'That subdomain is already taken.',
      };
    }

    const [tenantResult] = await conn.execute(
      'INSERT INTO tenants (subdomain, emoji) VALUES (?, ?)',
      [subdomain, input.emoji]
    );
    const tenantId = (tenantResult as { insertId: number }).insertId;

    const { hashPassword } = await import('@/lib/password');
    const passwordHash = await hashPassword(input.password);

    const [userResult] = await conn.execute(
      'INSERT INTO tenant_users (tenant_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [tenantId, email, passwordHash, 'owner']
    );
    void userResult;

    await conn.commit();

    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant) {
      return {
        ok: false,
        code: 'server_error',
        message: 'The tenant was created but could not be read back.',
      };
    }

    return { ok: true, tenant };
  } catch (error) {
    await conn.rollback();

    const code = (error as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') {
      return {
        ok: false,
        code: 'subdomain_taken',
        message: 'That subdomain is already taken.',
      };
    }

    throw error;
  } finally {
    conn.release();
  }
}

/** Reads a single tenant with its member count and owner email. */
export async function getTenantBySubdomain(
  subdomain: string
): Promise<TenantRecord | null> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT t.id, t.subdomain, t.emoji, t.created_at, t.updated_at,
            COUNT(u.id) AS userCount,
            MAX(CASE WHEN u.role = 'owner' THEN u.email END) AS ownerEmail
     FROM tenants t
     LEFT JOIN tenant_users u ON u.tenant_id = t.id AND u.is_active = TRUE
     WHERE t.subdomain = ?
     GROUP BY t.id, t.subdomain, t.emoji, t.created_at, t.updated_at`,
    [sanitizeSubdomain(subdomain)]
  );

  const row = (rows as Array<{
    id: number;
    subdomain: string;
    emoji: string;
    created_at: Date;
    updated_at: Date;
    userCount: number;
    ownerEmail: string | null;
  }>)[0];

  if (!row) return null;

  return {
    id: row.id,
    subdomain: row.subdomain,
    emoji: row.emoji,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userCount: Number(row.userCount),
    ownerEmail: row.ownerEmail,
  };
}

/** Lists tenants, newest first, capped at `limit`. */
export async function listTenants(limit = 100): Promise<TenantRecord[]> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT t.id, t.subdomain, t.emoji, t.created_at, t.updated_at,
            COUNT(u.id) AS userCount,
            MAX(CASE WHEN u.role = 'owner' THEN u.email END) AS ownerEmail
     FROM tenants t
     LEFT JOIN tenant_users u ON u.tenant_id = t.id AND u.is_active = TRUE
     GROUP BY t.id, t.subdomain, t.emoji, t.created_at, t.updated_at
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [Math.min(Math.max(limit, 1), 500)]
  );

  return (rows as Array<{
    id: number;
    subdomain: string;
    emoji: string;
    created_at: Date;
    updated_at: Date;
    userCount: number;
    ownerEmail: string | null;
  }>).map((row) => ({
    id: row.id,
    subdomain: row.subdomain,
    emoji: row.emoji,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userCount: Number(row.userCount),
    ownerEmail: row.ownerEmail,
  }));
}

/** Updates a tenant's branding (emoji only — the subdomain is immutable). */
export async function updateTenant(
  subdomain: string,
  updates: { emoji: string }
): Promise<TenantRecord | null> {
  const pool = await getMySQLPool();
  const [result] = await pool.execute(
    'UPDATE tenants SET emoji = ? WHERE subdomain = ?',
    [updates.emoji, sanitizeSubdomain(subdomain)]
  );

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return null;
  }

  return getTenantBySubdomain(subdomain);
}

/** Deletes a tenant and everything that belongs to it. */
export async function deleteTenant(subdomain: string): Promise<boolean> {
  const pool = await getMySQLPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT id FROM tenants WHERE subdomain = ?',
      [sanitizeSubdomain(subdomain)]
    );
    const tenant = (rows as Array<{ id: number }>)[0];

    if (!tenant) {
      await conn.rollback();
      return false;
    }

    await conn.execute('DELETE FROM tenant_users WHERE tenant_id = ?', [tenant.id]);
    await conn.execute('DELETE FROM tenant_sessions WHERE tenant_id = ?', [tenant.id]);
    await conn.execute('DELETE FROM tenants WHERE id = ?', [tenant.id]);
    await conn.execute('DELETE FROM kv_store WHERE `key` = ?', [
      `subdomain:${sanitizeSubdomain(subdomain)}`,
    ]);

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/** Lists the members of a tenant. */
export async function listTenantUsers(subdomain: string) {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT u.id, u.email, u.role, u.is_active AS isActive,
            u.created_at AS createdAt,
            (SELECT MAX(s.created_at) FROM tenant_sessions s WHERE s.user_id = u.id) AS lastLoginAt
     FROM tenant_users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE t.subdomain = ?
     ORDER BY u.created_at ASC`,
    [sanitizeSubdomain(subdomain)]
  );

  return (rows as Array<{
    id: number;
    email: string;
    role: string;
    isActive: number;
    createdAt: Date;
    lastLoginAt: Date | null;
  }>).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
  }));
}
