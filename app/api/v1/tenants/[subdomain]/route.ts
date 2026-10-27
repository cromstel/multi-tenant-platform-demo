import {
  deleteTenant,
  getTenantBySubdomain,
  updateTenant,
} from '@/lib/db/tenants';
import { isValidIcon } from '@/lib/subdomains';
import {
  apiErrors,
  ok,
  readJsonBody,
  requireAdminOrApiKey,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ subdomain: string }> };

/**
 * `GET /api/v1/tenants/{subdomain}` — read one tenant.
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const { subdomain } = await context.params;
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) return apiErrors.notFound('Tenant');

  return ok({
    ...tenant,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  });
}

/**
 * `PATCH /api/v1/tenants/{subdomain}` — update a tenant's branding.
 *
 * The subdomain is immutable — changing it would break every link, the
 * session cookie scope and the DNS record. Only the icon can change.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const { subdomain } = await context.params;
  const body = await readJsonBody<{ emoji?: unknown }>(request);

  if (!body) {
    return apiErrors.badRequest('A JSON body is required.');
  }

  if (body.emoji === undefined) {
    return apiErrors.badRequest('Nothing to update. Supply an `emoji`.');
  }

  if (typeof body.emoji !== 'string' || !isValidIcon(body.emoji)) {
    return apiErrors.badRequest('The icon must be an emoji of at most 10 characters.', {
      emoji: 'Invalid icon.',
    });
  }

  const tenant = await updateTenant(subdomain, { emoji: body.emoji });

  if (!tenant) return apiErrors.notFound('Tenant');

  return ok({
    ...tenant,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  });
}

/**
 * `DELETE /api/v1/tenants/{subdomain}` — delete a tenant.
 *
 * Cascades to the tenant's members and sessions.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const { subdomain } = await context.params;
  const deleted = await deleteTenant(subdomain);

  if (!deleted) return apiErrors.notFound('Tenant');

  return ok({ deleted: true, subdomain });
}
