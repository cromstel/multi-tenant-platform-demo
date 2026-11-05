import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createTenant, listTenants } from '@/lib/db/tenants';
import { isValidIcon } from '@/lib/subdomains';
import {
  apiErrors,
  enforceRateLimit,
  ok,
  readJsonBody,
  requireAdminOrApiKey,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Validation schema for `POST /api/v1/tenants`.
 *
 * Mirrors the rules enforced by `validateTenantInput` in `lib/db/tenants.ts`
 * so a malformed body is rejected with a 400 before any database work.
 */
const CreateTenantSchema = z.object({
  subdomain: z
    .string()
    .min(1, 'A subdomain is required.')
    .max(63, 'A subdomain may be at most 63 characters.')
    .regex(
      /^[a-z0-9-]+$/,
      'A subdomain may only contain lowercase letters, numbers and hyphens.'
    ),
  emoji: z
    .string()
    .min(1, 'An icon is required.')
    .refine((value) => isValidIcon(value), {
      message: 'The icon must be an emoji of at most 10 characters.',
    }),
  email: z
    .string()
    .min(1, 'An email address is required.')
    .max(255, 'That does not look like an email address.')
    .email('That does not look like an email address.'),
  password: z
    .string()
    .min(1, 'A password is required.')
    .min(8, 'A password must be at least 8 characters.')
    .max(200, 'A password may be at most 200 characters.'),
});

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

  const rawBody = await readJsonBody<Record<string, unknown>>(request);

  if (!rawBody) {
    return apiErrors.badRequest('A JSON body is required.');
  }

  const parsed = CreateTenantSchema.safeParse(rawBody);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path =
        issue.path.length > 0 ? issue.path.join('.') : 'body';
      details[path] = issue.message;
    }
    return apiErrors.badRequest('The tenant could not be created.', details);
  }

  const { subdomain, emoji, email, password } = parsed.data;

  const result = await createTenant({
    subdomain,
    emoji,
    email,
    password,
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
