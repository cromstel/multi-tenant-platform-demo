import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMySQLPool, closeMySQLPool } from '@/lib/db/mysql';
import { deleteTenant } from '@/lib/db/tenants';
import { redis } from '@/lib/redis';

/* ------------------------------------------------------------------ */
/*  Mock next/headers so route handlers can run outside a Next.js     */
/*  request (there is no async-local-storage in vitest). The stores    */
/*  below are populated by each test before it calls a handler.        */
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
/*  Mock the SAM LLM so chat tests are deterministic without real      */
/*  OpenRouter / ChatGPT API keys.                                     */
/* ------------------------------------------------------------------ */
vi.mock('@/lib/sam/llm', () => ({
  callSAM: vi.fn(),
}));

import { callSAM } from '@/lib/sam/llm';
import { NextRequest } from 'next/server';

import { GET as healthGet } from '@/app/api/health/route';
import { GET as tenantsListGet, POST as tenantsCreatePost } from '@/app/api/v1/tenants/route';
import { GET as tenantGet, PATCH as tenantPatch, DELETE as tenantDelete } from '@/app/api/v1/tenants/[subdomain]/route';
import { GET as tenantUsersGet } from '@/app/api/v1/tenants/[subdomain]/users/route';
import { GET as statsGet } from '@/app/api/v1/stats/route';
import { POST as samChatPost } from '@/app/api/sam/chat/route';

const API_KEY_NAME = 'test-api';
const API_KEY_SECRET = 'sk_test_api_key_00000000000000000000000000';

const CRUD_SUB = 'api-test-crud';
const USERS_SUB = 'api-test-users';
const SAM_SUB = 'api-test-sam';
let samConversationId: string | null = null;

function withApiKey() {
  requestHeaders['authorization'] = `Bearer ${API_KEY_SECRET}`;
}

function withoutAuth() {
  delete requestHeaders['authorization'];
}

async function jsonBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/* Rate-limit counters live in the shared Kv store (MySQL kv_store or the
 * local dev store, depending on env) and persist across runs, so reset the
 * ones our mutating tests touch via the app's own `redis` client to keep the
 * suite hermetic. */
async function resetRateLimit(prefix: string) {
  const keys = await redis.keys(`ratelimit:${prefix}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

beforeAll(async () => {
  process.env.API_KEYS = `${API_KEY_NAME}:${API_KEY_SECRET}`;
  await resetRateLimit('api:tenant_create');
  await resetRateLimit('sam_chat');
  await deleteTenant(CRUD_SUB);
  await deleteTenant(USERS_SUB);
});

beforeEach(() => {
  Object.keys(requestHeaders).forEach((key) => delete requestHeaders[key]);
  Object.keys(requestCookies).forEach((key) => delete requestCookies[key]);
});

afterAll(async () => {
  await deleteTenant(CRUD_SUB);
  await deleteTenant(USERS_SUB);
  if (samConversationId) {
    const pool = await getMySQLPool();
    await pool.execute('DELETE FROM messages WHERE conversation_id = ?', [
      samConversationId,
    ]);
    await pool.execute('DELETE FROM conversations WHERE id = ?', [
      samConversationId,
    ]);
  }
  await closeMySQLPool();
});

describe('GET /api/health', () => {
  it('returns 200 and healthy when MySQL is reachable', async () => {
    withoutAuth();
    const res = await healthGet();
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; status: string; checks: { database: { ok: boolean } } }>(res);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('healthy');
    expect(body.checks.database.ok).toBe(true);
  });
});

describe('GET /api/v1/tenants (list)', () => {
  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await tenantsListGet(new Request('http://localhost/api/v1/tenants'));
    expect(res.status).toBe(401);
  });

  it('lists tenants with an API key', async () => {
    withApiKey();
    const res = await tenantsListGet(new Request('http://localhost/api/v1/tenants?limit=50'));
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { tenants: unknown[]; count: number } }>(res);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.tenants)).toBe(true);
    expect(typeof body.data.count).toBe('number');
  });
});

describe('POST /api/v1/tenants (create)', () => {
  beforeAll(async () => {
    await deleteTenant(CRUD_SUB);
  });

  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: 'api-test-noauth',
          emoji: '🧪',
          email: 'owner@api-test-noauth.test',
          password: 'Password123',
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('creates a tenant and returns 201', async () => {
    withApiKey();
    const res = await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: CRUD_SUB,
          emoji: '🧪',
          email: 'owner@api-test-crud.test',
          password: 'Password123',
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await jsonBody<{ ok: boolean; data: { subdomain: string; emoji: string; ownerEmail: string | null } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.subdomain).toBe(CRUD_SUB);
    expect(body.data.emoji).toBe('🧪');
    expect(body.data.ownerEmail).toBe('owner@api-test-crud.test');
    expect(res.headers.get('location')).toBe(`/api/v1/tenants/${CRUD_SUB}`);
  });

  it('rejects an invalid body with 400', async () => {
    withApiKey();
    const res = await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: 'api-test-invalid',
          emoji: 'not-an-emoji',
          email: 'not-an-email',
          password: 'short',
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = await jsonBody<{ ok: boolean }>(res);
    expect(body.ok).toBe(false);
  });

  it('rejects a duplicate subdomain with 409', async () => {
    withApiKey();
    const first = await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: 'api-test-dup',
          emoji: '🧪',
          email: 'owner@api-test-dup.test',
          password: 'Password123',
        }),
      })
    );
    expect(first.status).toBe(201);
    const second = await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: 'api-test-dup',
          emoji: '🧪',
          email: 'other@api-test-dup.test',
          password: 'Password123',
        }),
      })
    );
    expect(second.status).toBe(409);
    await deleteTenant('api-test-dup');
  });
});

describe('GET /api/v1/tenants/{subdomain} (read one)', () => {
  const ctx = { params: Promise.resolve({ subdomain: CRUD_SUB }) };

  beforeAll(async () => {
    await deleteTenant(CRUD_SUB);
    await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: CRUD_SUB,
          emoji: '🧪',
          email: 'owner@api-test-crud.test',
          password: 'Password123',
        }),
      })
    );
  });

  afterAll(async () => {
    await deleteTenant(CRUD_SUB);
  });

  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await tenantGet(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('returns 200 and the tenant record', async () => {
    withApiKey();
    const res = await tenantGet(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`),
      ctx
    );
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { subdomain: string; emoji: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.subdomain).toBe(CRUD_SUB);
    expect(body.data.emoji).toBe('🧪');
  });

  it('returns 404 for a missing tenant', async () => {
    withApiKey();
    const missingCtx = { params: Promise.resolve({ subdomain: 'no-such-tenant-xyz' }) };
    const res = await tenantGet(
      new Request('http://localhost/api/v1/tenants/no-such-tenant-xyz'),
      missingCtx
    );
    expect(res.status).toBe(404);
    const body = await jsonBody<{ ok: boolean }>(res);
    expect(body.ok).toBe(false);
  });
});

describe('PATCH /api/v1/tenants/{subdomain} (update)', () => {
  const ctx = { params: Promise.resolve({ subdomain: CRUD_SUB }) };

  beforeAll(async () => {
    await deleteTenant(CRUD_SUB);
    await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: CRUD_SUB,
          emoji: '🧪',
          email: 'owner@api-test-crud.test',
          password: 'Password123',
        }),
      })
    );
  });

  afterAll(async () => {
    await deleteTenant(CRUD_SUB);
  });

  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await tenantPatch(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emoji: '✅' }),
      }),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('updates the emoji and returns 200', async () => {
    withApiKey();
    const res = await tenantPatch(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emoji: '✅' }),
      }),
      ctx
    );
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { emoji: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.emoji).toBe('✅');
  });

  it('rejects an invalid emoji with 400', async () => {
    withApiKey();
    const res = await tenantPatch(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emoji: 'not-an-emoji' }),
      }),
      ctx
    );
    expect(res.status).toBe(400);
    const body = await jsonBody<{ ok: boolean }>(res);
    expect(body.ok).toBe(false);
  });

  it('returns 404 for a missing tenant', async () => {
    withApiKey();
    const missingCtx = { params: Promise.resolve({ subdomain: 'no-such-tenant-xyz' }) };
    const res = await tenantPatch(
      new Request('http://localhost/api/v1/tenants/no-such-tenant-xyz', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emoji: '✅' }),
      }),
      missingCtx
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/tenants/{subdomain} (delete)', () => {
  const ctx = { params: Promise.resolve({ subdomain: CRUD_SUB }) };

  beforeAll(async () => {
    await deleteTenant(CRUD_SUB);
    await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: CRUD_SUB,
          emoji: '🧪',
          email: 'owner@api-test-crud.test',
          password: 'Password123',
        }),
      })
    );
  });

  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await tenantDelete(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('deletes the tenant and returns 200', async () => {
    withApiKey();
    const res = await tenantDelete(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`),
      ctx
    );
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { deleted: boolean; subdomain: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.deleted).toBe(true);
    expect(body.data.subdomain).toBe(CRUD_SUB);
  });

  it('returns 404 when the tenant is already gone', async () => {
    withApiKey();
    const res = await tenantDelete(
      new Request(`http://localhost/api/v1/tenants/${CRUD_SUB}`),
      ctx
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/tenants/{subdomain}/users (list members)', () => {
  const ctx = { params: Promise.resolve({ subdomain: USERS_SUB }) };

  beforeAll(async () => {
    await deleteTenant(USERS_SUB);
    await tenantsCreatePost(
      new Request('http://localhost/api/v1/tenants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: USERS_SUB,
          emoji: '🧪',
          email: 'owner@api-test-users.test',
          password: 'Password123',
        }),
      })
    );
  });

  afterAll(async () => {
    await deleteTenant(USERS_SUB);
  });

  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await tenantUsersGet(new Request(`http://localhost/api/v1/tenants/${USERS_SUB}/users`), ctx);
    expect(res.status).toBe(401);
  });

  it('lists the owner as a member', async () => {
    withApiKey();
    const res = await tenantUsersGet(new Request(`http://localhost/api/v1/tenants/${USERS_SUB}/users`), ctx);
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { users: unknown[]; count: number } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data.users)).toBe(true);
  });

  it('returns 404 for a missing tenant', async () => {
    withApiKey();
    const missingCtx = { params: Promise.resolve({ subdomain: 'no-such-tenant-xyz' }) };
    const res = await tenantUsersGet(new Request('http://localhost/api/v1/tenants/no-such-tenant-xyz/users'), missingCtx);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/stats (platform metrics)', () => {
  it('returns 401 without authentication', async () => {
    withoutAuth();
    const res = await statsGet();
    expect(res.status).toBe(401);
  });

  it('returns the stats payload with an API key', async () => {
    withApiKey();
    const res = await statsGet();
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { totalTenants: number; totalUsers: number; activeTenants: number; recentTenants: number } }>(res);
    expect(body.ok).toBe(true);
    expect(typeof body.data.totalTenants).toBe('number');
    expect(typeof body.data.totalUsers).toBe('number');
    expect(typeof body.data.activeTenants).toBe('number');
    expect(typeof body.data.recentTenants).toBe('number');
  });
});

describe('POST /api/sam/chat (SAM chatbot)', () => {
  const samBody = {
    messages: [{ role: 'user', content: 'Hi SAM' }],
    subdomain: SAM_SUB,
  };

  beforeEach(() => {
    vi.mocked(callSAM).mockResolvedValue({
      text: 'SAM says hi',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });
  });

  it('returns 200 and a conversation when the LLM responds', async () => {
    const req = new NextRequest('http://localhost/api/sam/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'sam_session=sess-1' },
      body: JSON.stringify(samBody),
    });
    const res = await samChatPost(req);
    expect(res.status).toBe(200);
    const body = await jsonBody<{ ok: boolean; data: { conversationId: string; session: string; response: { text: string; model: string; source: string } } }>(res);
    expect(body.ok).toBe(true);
    expect(typeof body.data.conversationId).toBe('string');
    expect(body.data.session).toBe('sess-1');
    expect(body.data.response.text).toBe('SAM says hi');
    samConversationId = body.data.conversationId;
  });

  it('returns 500 when the LLM provider is not configured / fails', async () => {
    vi.mocked(callSAM).mockRejectedValue(new Error('No LLM provider key configured.'));
    const req = new NextRequest('http://localhost/api/sam/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'sam_session=sess-2' },
      body: JSON.stringify(samBody),
    });
    const res = await samChatPost(req);
    expect(res.status).toBe(500);
    const body = await jsonBody<{ ok: boolean }>(res);
    expect(body.ok).toBe(false);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const req = new NextRequest('http://localhost/api/sam/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'sam_session=sess-3' },
      body: '{not-valid-json',
    });
    const res = await samChatPost(req);
    expect(res.status).toBe(400);
    const body = await jsonBody<{ ok: boolean }>(res);
    expect(body.ok).toBe(false);
  });
});
