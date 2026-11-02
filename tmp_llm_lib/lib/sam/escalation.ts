// lib/sam/escalation.ts — keyword escalation scan + escalations insert

import { getPool } from '@/lib/db/mysql';

const ESCALATION_KEYWORDS = ['human', 'person', 'agent', 'escalate', 'complaint', 'billing', 'refund', 'urgent'];

export function detectEscalation(messages: Array<{ role?: string; content?: string }>) {
  const text = messages.map((m) => (m.content ?? '')).join(' ').toLowerCase();
  for (const kw of ESCALATION_KEYWORDS) {
    if (text.includes(kw)) {
      return { shouldEscalate: true, reason: `Detected escalation keyword: "${kw}"` };
    }
  }
  return { shouldEscalate: false, reason: '' };
}

export async function createEscalation(convId: string, reason: string) {
  const pool = getPool();
  await pool.query('INSERT INTO escalations (conv_id, reason, created_at) VALUES (?, ?, NOW())', [convId, reason]);
  return { ok: true };
}
