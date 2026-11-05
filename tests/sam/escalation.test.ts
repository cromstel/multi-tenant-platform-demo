import { afterAll, describe, expect, it } from 'vitest';

import { createEscalation, detectEscalation } from '@/lib/sam/escalation';
import { getMySQLPool } from '@/lib/db/mysql';

/**
 * SAM escalation tests.
 *
 * `detectEscalation` is pure logic. `createEscalation` writes to the real
 * MySQL `escalations` table (the schema is created on first use) and cleans
 * up after itself.
 */

const KEYWORDS = [
  'urgent',
  'escalate',
  'manager',
  'supervisor',
  'legal',
  'lawsuit',
  'threat',
  'angry',
  'furious',
  'cancel account',
  'refund now',
];

const CONVERSATION_ID = 'conv-test-escalation';
const REASON =
  'Customer demanded an urgent refund and threatened legal action';

describe('detectEscalation', () => {
  it.each(KEYWORDS)('detects the keyword %s', (keyword) => {
    expect(detectEscalation(`I need help with this ${keyword} issue.`)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(detectEscalation('URGENT: help needed')).toBe(true);
    expect(detectEscalation('Please Escalate this now.')).toBe(true);
    expect(detectEscalation('LAWSUIT threat')).toBe(true);
  });

  it('returns false for ordinary support text', () => {
    expect(detectEscalation('How do I reset my billing?')).toBe(false);
    expect(detectEscalation('Where is my order?')).toBe(false);
    expect(detectEscalation('')).toBe(false);
  });
});

describe('createEscalation', () => {
  afterAll(async () => {
    const pool = await getMySQLPool();
    await pool.execute('DELETE FROM escalations WHERE conversation_id = ?', [
      CONVERSATION_ID,
    ]);
  });

  it('inserts a row into the escalations table', async () => {
    await createEscalation(CONVERSATION_ID, REASON);

    const pool = await getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT id, reason, resolved FROM escalations WHERE conversation_id = ?',
      [CONVERSATION_ID]
    );
    const found = (rows as Array<{ reason: string; resolved: number }>)[0];

    expect(found).toBeDefined();
    expect(found.reason).toBe(REASON);
    expect(found.resolved).toBe(0);
    expect(typeof found.id).toBe('string');
  });
});
