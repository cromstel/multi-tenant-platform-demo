import { z } from 'zod';

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

/**
 * Validation schema for `PATCH /api/v1/tenants/{subdomain}`.
 *
 * Only the icon can change; the subdomain is immutable. A malformed body is
 * rejected with a 400 before any database work.
 */
const UpdateTenantSchema = z.object({
  emoji: z
    .string()
    .min(1, 'An icon is required.')
    .refine((value) => isValidIcon(value), {
      message: 'The icon must be an emoji of at most 10 characters.',
    }),
});

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
  const rawBody = await readJsonBody<Record<string, unknown>>(request);

  if (!rawBody) {
    return apiErrors.badRequest('A JSON body is required.');
  }

  const parsed = UpdateTenantSchema.safeParse(rawBody);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path =
        issue.path.length > 0 ? issue.path.join('.') : 'body';
      details[path] = issue.message;
    }
    return apiErrors.badRequest('Invalid update body.', details);
  }

  const { emoji } = parsed.data;

  const tenant = await updateTenant(subdomain, { emoji });

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
