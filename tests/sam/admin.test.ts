// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { createTenant, deleteTenant } from '@/lib/db/tenants';
import { getMySQLPool } from '@/lib/db/mysql';

/**
 * SAM admin page tests (`/admin/sam`).
 *
 * The page is an async Server Component that requires an admin session and
 * queries real escalations from MySQL. We call the page function directly,
 * mock the auth gate and URL helpers, then render the returned JSX with RTL.
 *
 * Real MySQL is used for escalation data; every created tenant and escalation
 * is cleaned up afterwards.
 */

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  })
);

const mockRequireAdminSession = vi.hoisted(() => vi.fn());
const mockMaskMessage = vi.hoisted(() => vi.fn((message: string) => `masked:${message}`));
const mockAdminUrl = vi.hoisted(() => vi.fn((suffix = '') => `/__hidden_admin__${suffix}`));

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/app/auth/admin/login/actions', () => ({
  requireAdminSession: mockRequireAdminSession,
}));
vi.mock('@/lib/sam/filter', () => ({ maskMessage: mockMaskMessage }));
vi.mock('@/lib/admin-path', () => ({ adminUrl: mockAdminUrl }));

import SAMAdminPage from '@/app/admin/sam/page';

const SUBDOMAIN = 'sam-admin-test';
const CONVERSATION_ID = 'conv-sam-admin-test';
const ESCALATION_ID = 'esc-sam-admin-test';

async function insertConversation() {
  const pool = await getMySQLPool();
  await pool.execute(
    'INSERT INTO conversations (id, subdomain, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [CONVERSATION_ID, SUBDOMAIN]
  );
}

async function insertEscalation(id: string = ESCALATION_ID, reason: string = 'Urgent refund demand') {
  const pool = await getMySQLPool();
  await pool.execute(
    'INSERT INTO escalations (id, conversation_id, reason, resolved, created_at) VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [id, CONVERSATION_ID, reason]
  );
}

async function escalationCount(id: string): Promise<number> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM escalations WHERE id = ?', [id]);
  return Number((rows as Array<{ c: number }>)[0].c);
}

beforeAll(async () => {
  await deleteTenant(SUBDOMAIN).catch(() => undefined);
  await createTenant({ subdomain: SUBDOMAIN, emoji: '💬', email: `owner@${SUBDOMAIN}.test`, password: 'Password123' });
});

afterEach(async () => {
  vi.resetAllMocks();
  mockAdminUrl.mockReturnValue('/__hidden_admin__');
  mockRedirect.mockImplementation((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  });
});

afterAll(async () => {
  const pool = await getMySQLPool();
  await pool.execute('DELETE FROM escalations WHERE conversation_id = ?', [CONVERSATION_ID]);
  await pool.execute('DELETE FROM conversations WHERE id = ?', [CONVERSATION_ID]);
  await deleteTenant(SUBDOMAIN).catch(() => undefined);
});

describe('SAM admin page', () => {
  it('redirects to the admin login when there is no admin session', async () => {
    mockRequireAdminSession.mockImplementation(() => {
      mockRedirect('/__hidden_admin__/login');
      throw new Error('NEXT_REDIRECT:/__hidden_admin__/login');
    });

    await expect(SAMAdminPage()).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith('/__hidden_admin__/login');
  });

  it('renders real escalations from the database', async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: 1,
      email: 'admin@test.local',
      role: 'super_admin',
    });

    await insertConversation();
    await insertEscalation();

    try {
      const element = await SAMAdminPage();
      render(element);

      expect(screen.getByText(/Support Escalations/i)).toBeInTheDocument();
      // The masked reason should appear in the table.
      expect(screen.getByText(/masked:Urgent refund demand/i)).toBeInTheDocument();
      // The subdomain appears as part of the escalation ID in the table.
      expect(screen.getByText(/sam-admin-test/)).toBeInTheDocument();
      expect(await escalationCount(ESCALATION_ID)).toBe(1);
    } finally {
      const pool = await getMySQLPool();
      await pool.execute('DELETE FROM escalations WHERE id = ?', [ESCALATION_ID]);
      await pool.execute('DELETE FROM conversations WHERE id = ?', [CONVERSATION_ID]);
    }
  });

  it('shows "No escalations found" when the table is empty', async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: 1,
      email: 'admin@test.local',
      role: 'super_admin',
    });

    await insertConversation();

    try {
      const element = await SAMAdminPage();
      render(element);

      expect(screen.getByText(/No escalations found/i)).toBeInTheDocument();
    } finally {
      const pool = await getMySQLPool();
      await pool.execute('DELETE FROM conversations WHERE id = ?', [CONVERSATION_ID]);
    }
  });
});
