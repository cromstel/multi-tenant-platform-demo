// lib/sam/knowledge.ts — docs_sections + tenants only; no admin/auth/session/contact data

import { getPool } from '@/lib/db/mysql';

export async function getDocsContext(subdomain?: string) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT role, title, body FROM docs_sections ORDER BY sort_order ASC');
  return (rows as Array<{ role: string; title: string; body: string }>);
}

export async function getTenantContext(subdomain: string) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT subdomain, name, icon FROM tenants WHERE subdomain = ?', [subdomain]);
  const rowsArr = rows as Array<{ subdomain: string; name: string; icon: string | null }>;
  return rowsArr[0] ?? null;
}

export function buildSystemPrompt(subdomain?: string, docs?: Array<{ role: string; title: string; body: string }>, tenant?: { subdomain: string; name: string; icon: string | null } | null) {
  const parts: string[] = [];
  if (tenant) {
    parts.push(`Tenant: ${tenant.name} (${tenant.subdomain})`);
    if (tenant.icon) parts.push(`Icon: ${tenant.icon}`);
  }
  if (docs && docs.length) {
    const sections = docs.map((d) => `--- ${d.title} (${d.role}) ---\n${d.body}`).join('\n\n');
    parts.push(`Documentation sections:\n${sections}`);
  }
  return parts.join('\n\n');
}
