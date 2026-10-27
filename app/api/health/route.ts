import { NextResponse } from 'next/server';
import { getMySQLPool } from '@/lib/db/mysql';
import { storageDriver } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Liveness and readiness probe.
 *
 * Reports whether the process is up and whether its dependencies are
 * reachable. The database check is the important one — a process that cannot
 * reach MySQL cannot serve tenants, so a load balancer should pull it out
 * of rotation.
 *
 * Returns 200 when healthy, 503 when a dependency is down.
 */
export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, { ok: boolean; detail: string; ms: number }> = {};

  // Database
  const dbStart = Date.now();
  try {
    const pool = await getMySQLPool();
    await pool.execute('SELECT 1');
    checks.database = {
      ok: true,
      detail: 'reachable',
      ms: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      ok: false,
      detail: error instanceof Error ? error.message : 'unknown error',
      ms: Date.now() - dbStart,
    };
  }

  const healthy = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      ok: healthy,
      status: healthy ? 'healthy' : 'degraded',
      service: 'citgroup-tenancy-system',
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV,
      storage: storageDriver,
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
