import { getMySQLPool } from '@/lib/db/mysql';

const ESCALATION_KEYWORDS = ['urgent', 'escalate', 'manager', 'supervisor', 'legal', 'lawsuit', 'threat', 'angry', 'furious', 'cancel account', 'refund now'];

export function detectEscalation(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function createEscalation(conversationId: string, reason: string): Promise<void> {
  const pool = await getMySQLPool();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await pool.execute(
    'INSERT INTO escalations (id, conversation_id, reason, resolved) VALUES (?, ?, ?, 0)',
    [id, conversationId, reason]
  );
}
