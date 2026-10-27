import 'server-only';

import { revalidatePath } from 'next/cache';

/**
 * The public path of the admin area.
 *
 * `ADMIN_PATH` is the only entry point the operator knows. While it is set,
 * `proxy.ts` rewrites `/{ADMIN_PATH}` onto the internal `/auth/admin` routes
 * and answers those internal routes with a 404, so the real path is never
 * revealed. That has a consequence for every server-side redirect into the
 * admin area: redirecting to `/auth/admin` lands on the 404 rather than on
 * the dashboard. Such redirects have to go through `adminUrl()` instead.
 *
 * `proxy.ts` keeps its own copy of the parsing rule on purpose — it runs at
 * the edge and must not depend on shared modules.
 */
export function getAdminPath(): string | null {
  const configured = process.env.ADMIN_PATH?.trim();
  if (!configured) return null;
  // Normalise: no leading slash, no trailing slash, single segment.
  const cleaned = configured.replace(/^\/+|\/+$/g, '');
  return cleaned || null;
}

/**
 * The URL of the admin area, honouring the hidden `ADMIN_PATH`.
 *
 * @param suffix path below the admin root, e.g. `/login`.
 * @returns `/{ADMIN_PATH}{suffix}` when the path is hidden, and
 *          `/auth/admin{suffix}` when it is not.
 */
export function adminUrl(suffix = ''): string {
  const adminPath = getAdminPath();
  return adminPath ? `/${adminPath}${suffix}` : `/auth/admin${suffix}`;
}

/**
 * Invalidates the admin area in the router cache.
 *
 * The dashboard is reached through a rewrite, so the path the browser sees
 * (`/{ADMIN_PATH}`) and the route that is actually rendered (`/auth/admin`)
 * are different cache keys. Both are invalidated — otherwise the dashboard
 * keeps serving a stale tenant list after a delete.
 */
export function revalidateAdmin(): void {
  revalidatePath(adminUrl());
  revalidatePath('/auth/admin');
  revalidatePath('/admin');
}
