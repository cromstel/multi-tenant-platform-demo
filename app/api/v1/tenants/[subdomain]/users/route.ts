import { getTenantBySubdomain, listTenantUsers } from '@/lib/db/tenants';
import { apiErrors, ok, requireAdminOrApiKey } from '@/lib/api';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ subdomain: string }> };

/**
 * `GET /api/v1/tenants/{subdomain}/users` — list a tenant's members.
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const { subdomain } = await context.params;

  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) return apiErrors.notFound('Tenant');

  const users = await listTenantUsers(subdomain);

  return ok({
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    })),
    count: users.length,
  });
}
