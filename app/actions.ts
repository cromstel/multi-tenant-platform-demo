'use server';
import 'server-only';

import { redirect } from 'next/navigation';

import { getMySQLPool } from '@/lib/db/mysql';
import { deleteTenant, bulkDeleteTenants } from '@/lib/db/tenants';
import { sanitizeSubdomain } from '@/lib/utils';
import { getAdminSession } from '@/app/auth/admin/login/actions';
import { CREATE_LIMIT, DELETE_LIMIT, consume } from '@/lib/rate-limit';
import { rootDomain, protocol, validateSubdomain } from '@/lib/utils';
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

/**
 * Public landing-page entry point: creates the tenant row only (no owner).
 *
 * It intentionally does NOT delegate to `lib/db/tenants.ts:createTenant`,
 * which is the canonical tenant + owner path — that function requires an
 * email and a password, but this entry point's form (subdomain-form.tsx)
 * collects only the subdomain and icon, and this action is not permitted to
 * alter that form. Owner provisioning is a separate concern owned by
 * `registerAction` (app/auth/register/actions.ts), which creates the tenant
 * and its owner in one transaction. This action is therefore tenant-only by
 * design: it claims the subdomain on the landing page, and the owner account
 * is established through registration.
 */
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

  const validation = validateSubdomain(subdomain);
  if (!validation.ok) {
    return {
      subdomain,
      icon,
      success: false,
      error: validation.error ?? 'Invalid subdomain'
    };
  }
  const sanitizedSubdomain = validation.subdomain!;

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

  const limit = await consume('delete', DELETE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many delete requests from your network. Try again in about ${Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))} minutes.`
    };
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

  const limit = await consume('delete', DELETE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many delete requests from your network. Try again in about ${Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))} minutes.`
    };
  }

  const raw = formData.getAll('subdomains');
  const subdomains = raw
    .filter((value): value is string => typeof value === 'string')
    .map((value) => sanitizeSubdomain(value))
    .filter(Boolean);

  if (subdomains.length === 0) {
    return { error: 'Select at least one tenant to delete.' };
  }

  let deleted = 0;
  try {
    deleted = await bulkDeleteTenants(subdomains);
  } catch {
    return {
      error: 'The delete could not be completed. No tenants were removed.'
    };
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
