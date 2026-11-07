'use server';

import { redirect } from 'next/navigation';
import { getTenantSession } from '@/app/auth/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';

export type ProfileState = {
  error?: string;
  success?: boolean;
};

/**
 * Updates the signed-in tenant user's email address.
 *
 * The email must not already be taken by another active member of the same
 * tenant. On success the session cookie still carries the old email until the
 * next sign-in — that's acceptable for a display-level profile update.
 */
export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await getTenantSession();
  if (!session) {
    redirect('/auth/login');
  }

  const email = (formData.get('email') as string) || '';
  if (!email.trim()) {
    return { error: 'Email is required' };
  }

  const pool = await getMySQLPool();

  // Reject if another active member in this tenant already uses the email.
  const [existing] = await pool.execute(
    'SELECT id FROM tenant_users WHERE tenant_id = ? AND email = ? AND id <> ? AND is_active = TRUE LIMIT 1',
    [session.tenantId, email.trim(), session.userId]
  );
  if ((existing as Array<{ id: number }>).length > 0) {
    return { error: 'Email is already in use by another member of this tenant.' };
  }

  await pool.execute(
    'UPDATE tenant_users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
    [email.trim(), session.userId, session.tenantId]
  );

  return { success: true };
}
