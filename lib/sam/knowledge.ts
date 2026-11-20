import { getMySQLPool } from '@/lib/db/mysql';

export async function getDocsContext(): Promise<Array<{ title: string; body: string; role: string }>> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT title, body, role FROM docs_sections ORDER BY sort_order ASC'
  );
  return (rows as Array<{ title: string; body: string; role: string }>).map((r) => ({
    title: r.title,
    body: r.body,
    role: r.role,
  }));
}

export async function getTenantContext(subdomain: string): Promise<{ subdomain: string; name: string; icon: string } | null> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT subdomain, emoji AS icon FROM tenants WHERE subdomain = ?',
    [subdomain]
  );
  const row = (rows as Array<{ subdomain: string; icon: string }>)[0];
  if (!row) return null;
  return { subdomain: row.subdomain, name: row.subdomain, icon: row.icon };
}
