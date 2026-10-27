'use server';


import { getMySQLPool } from '@/lib/db/mysql';
import { hashPassword } from '@/lib/password';
import { sanitizeSubdomain } from '@/lib/subdomains';
import { revalidateAdmin } from '@/lib/admin-path';
import { getAdminSession } from '@/app/auth/admin/login/actions';
import { CREATE_LIMIT, consume } from '@/lib/rate-limit';

/**
 * Admin member management.
 *
 * Every action here re-checks the session itself. A Server Action is
 * reachable by direct POST regardless of what the page renders, so the page
 * guard is convenience and this check is the boundary.
 */

export type MemberActionState = {
  error?: string;
  success?: string;
};

const VALID_ROLES = ['owner', 'admin', 'member'] as const;
type MemberRole = (typeof VALID_ROLES)[number];

async function requireAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session);
}

/** Lists the members of a tenant. */
export async function listMembersAction(
  subdomain: string
): Promise<MemberActionState & { members?: Array<{ id: number; email: string; role: string; isActive: boolean }> }> {
  if (!(await requireAdmin())) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT u.id, u.email, u.role, u.is_active AS isActive
     FROM tenant_users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE t.subdomain = ?
     ORDER BY u.created_at ASC`,
    [sanitizeSubdomain(subdomain)]
  );

  const members = (rows as Array<{ id: number; email: string; role: string; isActive: number }>).map(
    (row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      isActive: Boolean(row.isActive),
    })
  );

  revalidateAdmin();

  return { members };
}

/** Changes a member's role. */
export async function changeMemberRoleAction(
  _prevState: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  if (!(await requireAdmin())) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const subdomain = formData.get('subdomain');
  const userId = formData.get('userId');
  const role = formData.get('role');

  if (typeof subdomain !== 'string' || !subdomain) {
    return { error: 'A tenant is required.' };
  }
  if (typeof userId !== 'string' || !/^\d+$/.test(userId)) {
    return { error: 'A member is required.' };
  }
  if (typeof role !== 'string' || !VALID_ROLES.includes(role as MemberRole)) {
    return { error: 'That role is not valid.' };
  }

  const pool = await getMySQLPool();

  // The last owner cannot be demoted — a tenant with no owner is
  // unmanageable.
  const [ownerRows] = await pool.execute(
    `SELECT id FROM tenant_users
     WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = ?) AND role = 'owner'`,
    [sanitizeSubdomain(subdomain)]
  );
  const owners = ownerRows as Array<{ id: number }>;

  if (owners.length === 1 && owners[0].id === Number(userId)) {
    return { error: 'A tenant must keep at least one owner.' };
  }

  const [result] = await pool.execute(
    `UPDATE tenant_users SET role = ?
     WHERE id = ? AND tenant_id = (SELECT id FROM tenants WHERE subdomain = ?)`,
    [role, Number(userId), sanitizeSubdomain(subdomain)]
  );

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return { error: 'That member no longer exists.' };
  }

  revalidateAdmin();

  return { success: 'Role updated.' };
}

/** Invites a new member to a tenant. */
export async function inviteMemberAction(
  _prevState: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  if (!(await requireAdmin())) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const limit = await consume('admin_invite', CREATE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many invitations. Try again in about ${Math.max(
        1,
        Math.ceil(limit.retryAfterSeconds / 60)
      )} minutes.`,
    };
  }

  const subdomain = formData.get('subdomain');
  const email = formData.get('email');
  const role = formData.get('role');

  if (typeof subdomain !== 'string' || !subdomain) {
    return { error: 'A tenant is required.' };
  }
  if (typeof email !== 'string' || !email.trim()) {
    return { error: 'An email address is required.' };
  }
  if (typeof role !== 'string' || !VALID_ROLES.includes(role as MemberRole)) {
    return { error: 'That role is not valid.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const pool = await getMySQLPool();

  const [tenantRows] = await pool.execute(
    'SELECT id FROM tenants WHERE subdomain = ?',
    [sanitizeSubdomain(subdomain)]
  );
  const tenant = (tenantRows as Array<{ id: number }>)[0];

  if (!tenant) {
    return { error: 'That tenant no longer exists.' };
  }

  // The unique index on (tenant_id, email) is the real guard against a
  // duplicate invite; the SELECT is only there for a friendlier message.
  const [existing] = await pool.execute(
    'SELECT id FROM tenant_users WHERE tenant_id = ? AND email = ?',
    [tenant.id, normalizedEmail]
  );

  if ((existing as Array<{ id: number }>).length > 0) {
    return { error: 'That person is already a member of this tenant.' };
  }

  // The invitee gets a random temporary password. There is no mail
  // transport wired up, so the password is returned once to the admin
  // rather than silently discarded.
  const temporaryPassword = `cit-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    await pool.execute(
      `INSERT INTO tenant_users (tenant_id, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [tenant.id, normalizedEmail, passwordHash, role]
    );
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      return { error: 'That person is already a member of this tenant.' };
    }
    throw error;
  }

  revalidateAdmin();

  return {
    success: `${normalizedEmail} added to ${subdomain}. Temporary password: ${temporaryPassword}`,
  };
}

/** Suspends or restores a member. */
export async function setMemberActiveAction(
  _prevState: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  if (!(await requireAdmin())) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const subdomain = formData.get('subdomain');
  const userId = formData.get('userId');
  const active = formData.get('active');

  if (typeof subdomain !== 'string' || !subdomain) {
    return { error: 'A tenant is required.' };
  }
  if (typeof userId !== 'string' || !/^\d+$/.test(userId)) {
    return { error: 'A member is required.' };
  }

  const pool = await getMySQLPool();
  const shouldBeActive = active === 'true';

  // The last active owner cannot be suspended, for the same reason they
  // cannot be demoted.
  if (!shouldBeActive) {
    const [ownerRows] = await pool.execute(
      `SELECT u.id FROM tenant_users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE t.subdomain = ? AND u.role = 'owner' AND u.is_active = TRUE`,
      [sanitizeSubdomain(subdomain)]
    );
    const activeOwners = ownerRows as Array<{ id: number }>;

    if (activeOwners.length === 1 && activeOwners[0].id === Number(userId)) {
      return { error: 'A tenant must keep at least one active owner.' };
    }
  }

  const [result] = await pool.execute(
    `UPDATE tenant_users SET is_active = ?
     WHERE id = ? AND tenant_id = (SELECT id FROM tenants WHERE subdomain = ?)`,
    [shouldBeActive, Number(userId), sanitizeSubdomain(subdomain)]
  );

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return { error: 'That member no longer exists.' };
  }

  revalidateAdmin();

  return { success: shouldBeActive ? 'Member restored.' : 'Member suspended.' };
}

/** Removes a member from a tenant. */
export async function removeMemberAction(
  _prevState: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  if (!(await requireAdmin())) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const subdomain = formData.get('subdomain');
  const userId = formData.get('userId');

  if (typeof subdomain !== 'string' || !subdomain) {
    return { error: 'A tenant is required.' };
  }
  if (typeof userId !== 'string' || !/^\d+$/.test(userId)) {
    return { error: 'A member is required.' };
  }

  const pool = await getMySQLPool();

  // The last owner cannot be removed — the tenant would be orphaned.
  const [ownerRows] = await pool.execute(
    `SELECT u.id FROM tenant_users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE t.subdomain = ? AND u.role = 'owner'`,
    [sanitizeSubdomain(subdomain)]
  );
  const owners = ownerRows as Array<{ id: number }>;

  if (owners.length === 1 && owners[0].id === Number(userId)) {
    return { error: 'A tenant must keep at least one owner.' };
  }

  const [result] = await pool.execute(
    `DELETE FROM tenant_users
     WHERE id = ? AND tenant_id = (SELECT id FROM tenants WHERE subdomain = ?)`,
    [Number(userId), sanitizeSubdomain(subdomain)]
  );

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return { error: 'That member no longer exists.' };
  }

  revalidateAdmin();

  return { success: 'Member removed.' };
}
