import { NextResponse } from 'next/server';
import { createTenant, listTenants, validateTenantInput } from '@/lib/db/tenants';
import {
  apiErrors,
  enforceRateLimit,
  ok,
  readJsonBody,
  requireAdminOrApiKey,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/v1/tenants` — list tenants.
 *
 * Requires an admin session cookie or a machine key.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const tenants = await listTenants(Number.isFinite(limit) ? limit : 100);

  return ok({
    tenants: tenants.map((tenant) => ({
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    })),
    count: tenants.length,
  });
}

/**
 * `POST /api/v1/tenants` — create a tenant and its owner.
 *
 * Rate limited per IP, because this is the same operation the public
 * landing page performs.
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const limited = await enforceRateLimit('api:tenant_create', 10, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await readJsonBody<{
    subdomain?: unknown;
    emoji?: unknown;
    email?: unknown;
    password?: unknown;
  }>(request);

  if (!body) {
    return apiErrors.badRequest('A JSON body is required.');
  }

  const errors = validateTenantInput(body);
  if (errors) {
    return apiErrors.badRequest('The tenant could not be created.', errors);
  }

  const result = await createTenant({
    subdomain: body.subdomain as string,
    emoji: body.emoji as string,
    email: body.email as string,
    password: body.password as string,
  });

  if (!result.ok) {
    const status = result.code === 'subdomain_taken' ? 409 : 400;
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return ok(
    {
      ...result.tenant,
      createdAt: result.tenant.createdAt.toISOString(),
      updatedAt: result.tenant.updatedAt.toISOString(),
    },
    201,
    { Location: `/api/v1/tenants/${result.tenant.subdomain}` }
  );
}
