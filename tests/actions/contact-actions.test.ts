import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMySQLPool } from '@/lib/db/mysql';
import { submitContactAction } from '@/app/contact/actions';

/**
 * Integration tests for the contact-form Server Action against real MySQL.
 *
 * A valid submission is stored in `contact_enquiries`. The rate limiter is
 * mocked so each test is deterministic; every enquiry created is removed in
 * `afterEach`.
 */

const mockConsume = vi.hoisted(() =>
  vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60, attemptsLeft: 4 }))
);

vi.mock('@/lib/rate-limit', () => ({ consume: mockConsume }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const toClean: string[] = [];

function formData(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

async function enquiryCount(email: string): Promise<number> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM contact_enquiries WHERE email = ?', [email]);
  return Number((rows as Array<{ c: number }>)[0].c);
}

afterEach(async () => {
  const pool = await getMySQLPool();
  for (const email of toClean) {
    await pool.execute('DELETE FROM contact_enquiries WHERE email = ?', [email]).catch(() => undefined);
  }
  toClean.length = 0;
  vi.resetAllMocks();
  mockConsume.mockResolvedValue({ allowed: true, retryAfterSeconds: 60, attemptsLeft: 4 });
});

const base = (suffix: string) => `test-action-contact-${suffix}@example.invalid`;

describe('submitContactAction', () => {
  it('stores a valid submission in contact_enquiries', async () => {
    const email = base('valid');
    toClean.push(email);

    const result = await submitContactAction(
      {},
      formData([
        ['name', 'Ada Lovelace'],
        ['email', email],
        ['company', 'Analytical Co'],
        ['category', 'sales'],
        ['subject', 'Pricing question'],
        ['message', 'This is a detailed message with more than twenty characters.'],
      ])
    );

    expect(result.success).toContain('message has been received');
    expect(await enquiryCount(email)).toBe(1);
  });

  it('silently drops a submission that fills the honeypot field', async () => {
    const email = base('honeypot');
    toClean.push(email);

    const result = await submitContactAction(
      {},
      formData([
        ['name', 'Spammer'],
        ['email', email],
        ['subject', 'Buy now'],
        ['message', 'Buy cheap meds here please click this link immediately.'],
        ['website', 'https://spam.example.com'],
      ])
    );

    expect(result.success).toContain('message has been received');
    expect(await enquiryCount(email)).toBe(0);
  });

  it('reports field errors for missing required fields and stores nothing', async () => {
    const email = base('missing');
    toClean.push(email);

    const result = await submitContactAction(
      {},
      formData([
        ['name', ''],
        ['email', email],
        ['subject', ''],
        ['message', 'short'],
      ])
    );

    expect(result.success).toBeUndefined();
    expect(result.error).toBe('Please correct the highlighted fields.');
    expect(result.fieldErrors?.name).toBeDefined();
    expect(result.fieldErrors?.subject).toBeDefined();
    expect(result.fieldErrors?.message).toBeDefined();
    expect(await enquiryCount(email)).toBe(0);
  });

  it('rejects a malformed email address', async () => {
    const email = base('bademail');
    toClean.push(email);

    const result = await submitContactAction(
      {},
      formData([
        ['name', 'Ada'],
        ['email', 'not-an-email'],
        ['subject', 'Question'],
        ['message', 'This is a detailed message with more than twenty characters.'],
      ])
    );

    expect(result.success).toBeUndefined();
    expect(result.fieldErrors?.email).toBeDefined();
    expect(await enquiryCount('not-an-email')).toBe(0);
  });

  it('rejects a message shorter than 20 characters', async () => {
    const email = base('shortmsg');
    toClean.push(email);

    const result = await submitContactAction(
      {},
      formData([
        ['name', 'Ada'],
        ['email', email],
        ['subject', 'Question'],
        ['message', 'too short'],
      ])
    );

    expect(result.success).toBeUndefined();
    expect(result.fieldErrors?.message).toBeDefined();
    expect(await enquiryCount(email)).toBe(0);
  });

  it('applies the rate limit when consume denies the request', async () => {
    const email = base('ratelimit');
    toClean.push(email);

    mockConsume.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600, attemptsLeft: 0 });

    const result = await submitContactAction(
      {},
      formData([
        ['name', 'Ada'],
        ['email', email],
        ['subject', 'Question'],
        ['message', 'This is a detailed message with more than twenty characters.'],
      ])
    );

    expect(result.success).toBeUndefined();
    expect(result.error).toContain('Too many messages sent');
    expect(await enquiryCount(email)).toBe(0);
  });
});
