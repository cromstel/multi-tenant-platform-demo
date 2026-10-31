'use server';

import { redirect } from 'next/navigation';

import { getMySQLPool, deleteTenant } from '@/lib/db/mysql';
import { sanitizeSubdomain } from '@/lib/subdomains';
import { getAdminSession } from '@/app/auth/admin/login/actions';
import { CREATE_LIMIT, consume } from '@/lib/rate-limit';
import { rootDomain, protocol } from '@/lib/utils';
import { revalidateAdmin } from '@/lib/admin-path';

export type CreateSubdomainState = {
  error?: string;
  success?: boolean;
  subdomain?: string;
  icon?: string;
};

export type DeleteSubdomainState = {
  error?: string;
  success?: string;
};

export type BulkDeleteState = {
  error?: string;
  success?: string;
  count?: number;
};

export async function createSubdomainAction(
  _prevState: CreateSubdomainState,
  formData: FormData
): Promise<CreateSubdomainState> {
  // Tenant creation is intentionally public, but unthrottled it lets an
  // automated client exhaust the namespace. Every attempt is counted, so the
  // limit reflects requests rather than outcomes.
  const limit = await consume('create', CREATE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many subdomains created from your network. Try again in about ${
        Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))
      } minutes.`
    };
  }

  const subdomain = formData.get('subdomain') as string;
  const icon = (formData.get('icon') as string) || '⭐';

  if (!subdomain) {
    return { success: false, error: 'Subdomain is required' };
  }

  const sanitizedSubdomain = sanitizeSubdomain(subdomain);

  if (!sanitizedSubdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const pool = await getMySQLPool();

  // The unique index on `tenants.subdomain` is the real guard against a race
  // between two simultaneous signups; the SELECT is only there to return a
  // friendly message instead of a driver-level duplicate-key error.
  const [existing] = await pool.execute(
    'SELECT id FROM tenants WHERE subdomain = ?',
    [sanitizedSubdomain]
  );

  if ((existing as Array<{ id: number }>).length > 0) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await pool.execute('INSERT INTO tenants (subdomain, emoji) VALUES (?, ?)', [
    sanitizedSubdomain,
    icon
  ]);

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
}

export async function deleteSubdomainAction(
  _prevState: DeleteSubdomainState,
  formData: FormData
): Promise<DeleteSubdomainState> {
  // Authorise inside the action, not just on the page that renders its form.
  // A Server Action is reachable by direct POST regardless of what the page
  // checks, so this is the check that actually protects the data.
  //
  // This must use the same session helper as the admin pages. The two used to
  // read different cookies, which made every delete fail with "session
  // expired" even for a signed-in admin.
  const session = await getAdminSession();
  if (!session) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const rawSubdomain = formData.get('subdomain');

  if (typeof rawSubdomain !== 'string' || !rawSubdomain) {
    return { error: 'A subdomain is required' };
  }

  const deleted = await deleteTenant(sanitizeSubdomain(rawSubdomain));

  if (!deleted) {
    return { error: 'That tenant no longer exists.' };
  }

  revalidateAdmin();
  return { success: 'Domain deleted successfully' };
}

export async function bulkDeleteSubdomainsAction(
  _prevState: BulkDeleteState,
  formData: FormData
): Promise<BulkDeleteState> {
  // Same in-action authorisation requirement as the single delete.
  const session = await getAdminSession();
  if (!session) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const raw = formData.getAll('subdomains');
  const subdomains = raw
    .filter((value): value is string => typeof value === 'string')
    .map((value) => sanitizeSubdomain(value))
    .filter(Boolean);

  if (subdomains.length === 0) {
    return { error: 'Select at least one tenant to delete.' };
  }

  const pool = await getMySQLPool();
  const conn = await pool.getConnection();

  let deleted = 0;

  try {
    await conn.beginTransaction();

    for (const subdomain of subdomains) {
      const [rows] = await conn.execute(
        'SELECT id FROM tenants WHERE subdomain = ?',
        [subdomain]
      );
      const tenant = (rows as Array<{ id: number }>)[0];
      if (!tenant) continue;

      // Children first — the foreign keys cascade, but deleting explicitly
      // keeps the intent obvious and works on engines with FK checks off.
      await conn.execute('DELETE FROM tenant_users WHERE tenant_id = ?', [tenant.id]);
      await conn.execute('DELETE FROM tenant_sessions WHERE tenant_id = ?', [tenant.id]);
      await conn.execute('DELETE FROM tenants WHERE id = ?', [tenant.id]);

      deleted++;
    }

    await conn.commit();
  } catch {
    await conn.rollback();
    return {
      error: 'The delete could not be completed. No tenants were removed.'
    };
  } finally {
    conn.release();
  }

  revalidateAdmin();

  return {
    success:
      deleted === 1
        ? '1 tenant deleted successfully'
        : `${deleted} tenants deleted successfully`,
    count: deleted
  };
}
