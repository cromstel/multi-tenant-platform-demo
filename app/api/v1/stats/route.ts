import { getAdminStats } from '@/lib/db/mysql';
import { apiErrors, ok, requireAdminOrApiKey } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/v1/stats` — platform metrics.
 *
 * The same numbers the admin dashboard shows, for dashboards and alerting
 * that read from the API rather than scraping the page.
 */
export async function GET() {
  const auth = await requireAdminOrApiKey();
  if (!auth) return apiErrors.unauthorized();

  const stats = await getAdminStats();

  return ok({
    ...stats,
    generatedAt: new Date().toISOString(),
  });
}
