import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMySQLPool, closeMySQLPool } from '@/lib/db/mysql';

/* ------------------------------------------------------------------ */
/*  Mock next/headers so route handlers can run outside a Next.js     */
/*  request.                                                          */
/* ------------------------------------------------------------------ */
const requestHeaders: Record<string, string> = {};
const requestCookies: Record<string, string> = {};

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: (key: string) => requestHeaders[String(key).toLowerCase()] ?? null,
  })),
  cookies: vi.fn(() => ({
    get: (name: string) => ({ value: requestCookies[name] }),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

/* ------------------------------------------------------------------ */
/*  Mock the admin session so we can control which user is            */
/*  authenticated for session-based API calls.                        */
/* ------------------------------------------------------------------ */
const mockGetAdminSession = vi.hoisted(() => vi.fn());
vi.mock('@/app/auth/admin/login/actions', () => ({
  getAdminSession: mockGetAdminSession,
}));

import { GET as sessionsListGet } from '@/app/api/v1/sessions/route';
import { DELETE as sessionRevokeDelete } from '@/app/api/v1/sessions/[id]/route';

const API_KEY_NAME = 'test-api-sessions';
const API_KEY_SECRET = 'sk_test_sessions_00000000000000000000000';

function withApiKey() {
  requestHeaders['authorization'] = `Bearer ${API_KEY_SECRET}`;
}

function withoutAuth() {
  delete requestHeaders['authorization'];
}

function asSessionUser(userId: number, email: string) {
  mockGetAdminSession.mockResolvedValue({ userId, email, role: 'super_admin' });
}

function asNoSession() {
  mockGetAdminSession.mockResolvedValue(null);
}

async function jsonBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function insertAdminSession(id: string, userId: number, expiresAt: number = Date.now() + 86400000) {
  const pool = await getMySQLPool();
  await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await pool.execute(
      'INSERT INTO admin_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [id, userId, expiresAt]
    );
  } finally {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function adminSessionExists(id: string): Promise<boolean> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute('SELECT 1 FROM admin_sessions WHERE id = ? LIMIT 1', [id]);
  return (rows as Array<{ 1: number }>).length > 0;
}

async function deleteAdminSession(id: string) {
  const pool = await getMySQLPool();
  await pool.execute('DELETE FROM admin_sessions WHERE id = ?', [id]);
}

const SESSION_OWNER_ID = 1;
const SESSION_OTHER_ID = 2;
const OWNER_SESSION_ID = 'sess-owner-0000000000000001';
const OTHER_SESSION_ID = 'sess-other-0000000000000002';

beforeAll(async () => {
  process.env.API_KEYS = `${API_KEY_NAME}:${API_KEY_SECRET}`;
  // Clean up any leftover test sessions
  await deleteAdminSession(OWNER_SESSION_ID).catch(() => undefined);
  await deleteAdminSession(OTHER_SESSION_ID).catch(() => undefined);
});

beforeEach(() => {
  Object.keys(requestHeaders).forEach((key) => delete requestHeaders[key]);
  Object.keys(requestCookies).forEach((key) => delete requestCookies[key]);
  vi.resetAllMocks();
});

afterAll(async () => {
  await deleteAdminSession(OWNER_SESSION_ID).catch(() => undefined);
  await deleteAdminSession(OTHER_SESSION_ID).catch(() => undefined);
  await closeMySQLPool();
});

describe('GET /api/v1/sessions', () => {
  it('returns 401 without authentication', async () => {
    withoutAuth();
    asNoSession();
    const res = await sessionsListGet();
    expect(res.status).toBe(401);
  });

  it('lists sessions with an API key', async () => {
    withApiKey();
    asNoSession();
    await insertAdminSession(OWNER_SESSION_ID, SESSION_OWNER_ID);
    try {
      const res = await sessionsListGet();
      expect(res.status).toBe(200);
      const body = await jsonBody<{ ok: boolean; data: { sessions: unknown[]; count: number } }>(res);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data.sessions)).toBe(true);
      expect(body.data.count).toBeGreaterThanOrEqual(1);
    } finally {
      await deleteAdminSession(OWNER_SESSION_ID);
    }
  });
});

describe('DELETE /api/v1/sessions/[id]', () => {
  const ctx = { params: Promise.resolve({ id: OWNER_SESSION_ID }) };
  const otherCtx = { params: Promise.resolve({ id: OTHER_SESSION_ID }) };

  beforeAll(async () => {
    await insertAdminSession(OWNER_SESSION_ID, SESSION_OWNER_ID);
    await insertAdminSession(OTHER_SESSION_ID, SESSION_OTHER_ID);
  });

  afterAll(async () => {
    await deleteAdminSession(OWNER_SESSION_ID).catch(() => undefined);
    await deleteAdminSession(OTHER_SESSION_ID).catch(() => undefined);
  });

  it('returns 401 without authentication', async () => {
    withoutAuth();
    asNoSession();
    const res = await sessionRevokeDelete(new Request('http://localhost/api/v1/sessions/x'), ctx);
    expect(res.status).toBe(401);
  });

  it('revokes a session owned by the authenticated user', async () => {
    // Session auth only — no API key — so the ownership-checked path runs.
    asSessionUser(SESSION_OWNER_ID, 'owner@test.local');

    expect(await adminSessionExists(OWNER_SESSION_ID)).toBe(true);

    const res = await sessionRevokeDelete(new Request('http://localhost/api/v1/sessions/x', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { revoked: boolean; id: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.revoked).toBe(true);
    expect(body.data.id).toBe(OWNER_SESSION_ID);

    expect(await adminSessionExists(OWNER_SESSION_ID)).toBe(false);
  });

  it('returns 403 when a session user tries to revoke another user\'s session', async () => {
    asSessionUser(SESSION_OWNER_ID, 'owner@test.local');

    // The other user's session still exists
    expect(await adminSessionExists(OTHER_SESSION_ID)).toBe(true);

    const res = await sessionRevokeDelete(
      new Request('http://localhost/api/v1/sessions/y', { method: 'DELETE' }),
      otherCtx
    );
    expect(res.status).toBe(403);

    // The other user's session is still there
    expect(await adminSessionExists(OTHER_SESSION_ID)).toBe(true);

    await deleteAdminSession(OTHER_SESSION_ID);
  });

  it('returns 404 when the session does not exist', async () => {
    asSessionUser(SESSION_OWNER_ID, 'owner@test.local');

    const missingCtx = { params: Promise.resolve({ id: 'does-not-exist-session' }) };
    const res = await sessionRevokeDelete(
      new Request('http://localhost/api/v1/sessions/z', { method: 'DELETE' }),
      missingCtx
    );
    expect(res.status).toBe(404);
  });
});
