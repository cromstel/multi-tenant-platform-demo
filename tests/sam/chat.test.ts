import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sam/chat/route';

/**
 * Route-level tests for POST /api/sam/chat.
 *
 * External dependencies are mocked so the suite is hermetic: no real database
 * writes, no rate-limit store calls, and no real LLM network requests.
 */

const hoisted = vi.hoisted(() => ({
  mockPool: {
    execute: vi.fn().mockResolvedValue([[]]),
  },
  mockConsume: vi.fn().mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 1,
    attemptsLeft: 19,
  }),
  mockCallSAM: vi.fn(),
}));

vi.mock('@/lib/db/mysql', () => ({
  getMySQLPool: vi.fn().mockResolvedValue(hoisted.mockPool),
  closeMySQLPool: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limit', () => ({
  consume: hoisted.mockConsume,
  SAM_LIMIT: { max: 20, windowMs: 15 * 60 * 1000 },
}));

vi.mock('@/lib/sam/llm', () => ({
  callSAM: hoisted.mockCallSAM,
}));

const BASE_URL = 'http://localhost/api/sam/chat';
const MESSAGES = [{ role: 'user', content: 'Hello, SAM' }];

function buildRequest(body: unknown, cookieValue?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookieValue !== undefined) {
    headers.cookie = `sam_session=${cookieValue}`;
  }
  return new NextRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  hoisted.mockPool.execute.mockReset();
  hoisted.mockConsume.mockReset().mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 1,
    attemptsLeft: 19,
  });
  hoisted.mockCallSAM.mockReset();
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.CHATGPT_API_KEY;
  delete process.env.SAM_MODEL;
});

describe('POST /api/sam/chat', () => {
  it('returns 500 when no LLM provider key is configured (fail closed)', async () => {
    hoisted.mockCallSAM.mockRejectedValue(
      new Error(
        'No LLM provider key configured: set OPENROUTER_API_KEY or CHATGPT_API_KEY.'
      )
    );

    const res = await POST(buildRequest({ messages: MESSAGES }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('server_error');
  });

  it('returns 200 with { text, model, source } when keys are mocked', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    hoisted.mockCallSAM.mockResolvedValue({
      text: 'Hello back',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });

    const res = await POST(buildRequest({ messages: MESSAGES }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.response).toEqual({
      text: 'Hello back',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });
    expect(hoisted.mockCallSAM).toHaveBeenCalledWith(MESSAGES);
    expect(hoisted.mockConsume).toHaveBeenCalledWith('sam_chat', {
      max: 20,
      windowMs: 15 * 60 * 1000,
    });
  });
});
