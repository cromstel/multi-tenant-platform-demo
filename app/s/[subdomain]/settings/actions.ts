'use server';

import { redirect } from 'next/navigation';
import { getTenantSession } from '@/app/auth/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';
import { isValidIcon } from '@/lib/subdomains';

export type SettingsState = {
  error?: string;
  success?: boolean;
};

/**
 * Updates the tenant's brand mark (emoji/icon).
 *
 * Only a valid emoji (max 10 characters) is accepted, matching the
 * `tenants.emoji` column constraint and the `isValidIcon` check used when
 * provisioning tenants.
 */
export async function updateTenantBranding(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getTenantSession();
  if (!session) {
    redirect('/auth/login');
  }

  const icon = (formData.get('icon') as string) || '';
  if (!icon.trim()) {
    return { error: 'A brand mark (emoji) is required.' };
  }

  if (!isValidIcon(icon.trim())) {
    return { error: 'Pick a valid emoji as your brand mark.' };
  }

  const pool = await getMySQLPool();
  await pool.execute(
    'UPDATE tenants SET emoji = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [icon.trim(), session.tenantId]
  );

  return { success: true };
}
