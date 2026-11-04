import { redirect } from 'next/navigation';
import { adminUrl } from '@/lib/admin-path';
import { getTenantSession } from '@/app/auth/login/actions';
import { getAdminSession } from '@/app/auth/admin/login/actions';

export async function requireTenantRole(allowedRoles: string[]): Promise<{ userId: number; tenantId: number; email: string; role: string }> {
  const session = await getTenantSession();
  if (!session) redirect('/auth/login');
  if (!allowedRoles.includes(session.role)) redirect('/');
  return session;
}

export async function requireAdminRole(allowedRoles: string[]): Promise<{ userId: number; email: string; role: string }> {
  const session = await getAdminSession();
  if (!session) redirect(adminUrl('/login'));
  if (!allowedRoles.includes(session.role)) redirect('/');
  return session;
}
