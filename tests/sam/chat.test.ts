import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sam/chat/route';

/**
 * Route-level tests for `POST /api/sam/chat`.
 *
 * External dependencies are mocked so the suite is hermetic: no real database
 * writes, no rate-limit store calls, and no real LLM network requests. The
 * PII filter, escalation detector and knowledge context are also mocked so
 * the route's wiring (not their internals) is what's under test.
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
  mockSanitizePII: vi.fn((text: string) => text),
  mockMaskMessage: vi.fn((message: string) => message),
  mockDetectEscalation: vi.fn(() => false),
  mockCreateEscalation: vi.fn().mockResolvedValue(undefined),
  mockGetDocsContext: vi.fn().mockResolvedValue([
    { title: 'Return Policy', body: '30 days', role: 'support' },
  ]),
  mockGetTenantContext: vi.fn().mockResolvedValue(null),
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

vi.mock('@/lib/sam/filter', () => ({
  sanitizePII: hoisted.mockSanitizePII,
  maskMessage: hoisted.mockMaskMessage,
}));

vi.mock('@/lib/sam/escalation', () => ({
  detectEscalation: hoisted.mockDetectEscalation,
  createEscalation: hoisted.mockCreateEscalation,
}));

vi.mock('@/lib/sam/knowledge', () => ({
  getDocsContext: hoisted.mockGetDocsContext,
  getTenantContext: hoisted.mockGetTenantContext,
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
  hoisted.mockSanitizePII.mockReset().mockImplementation((text: string) => text);
  hoisted.mockMaskMessage.mockReset().mockImplementation((message: string) => message);
  hoisted.mockDetectEscalation.mockReset().mockReturnValue(false);
  hoisted.mockCreateEscalation.mockReset();
  hoisted.mockGetDocsContext.mockReset().mockResolvedValue([
    { title: 'Return Policy', body: '30 days', role: 'support' },
  ]);
  hoisted.mockGetTenantContext.mockReset().mockResolvedValue(null);
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

  it('redacts PII, enriches context, masks the reply and returns escalated=false', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    hoisted.mockCallSAM.mockResolvedValue({
      text: 'Hello back',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });

    const res = await POST(buildRequest({ messages: MESSAGES, subdomain: 'acme' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.escalated).toBe(false);
    expect(json.data.response).toEqual({
      text: 'Hello back',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });

    // PII filter applied to user content before storage / LLM.
    expect(hoisted.mockSanitizePII).toHaveBeenCalledWith('Hello, SAM');
    // Mask applied to the assistant response before storing/returning.
    expect(hoisted.mockMaskMessage).toHaveBeenCalledWith('Hello back');
    // Context + sanitized messages passed to the LLM.
    expect(hoisted.mockCallSAM).toHaveBeenCalledTimes(1);
    const callArgs = hoisted.mockCallSAM.mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    expect(callArgs[0].role).toBe('system');
    expect(callArgs[0].content).toContain('Return Policy');
    expect(callArgs[1]).toEqual({ role: 'user', content: 'Hello, SAM' });
    // No escalation for a normal message.
    expect(hoisted.mockDetectEscalation).toHaveBeenCalledWith('Hello, SAM');
    expect(hoisted.mockCreateEscalation).not.toHaveBeenCalled();
    // Rate limiting and knowledge context lookups.
    expect(hoisted.mockConsume).toHaveBeenCalledWith('sam_chat', {
      max: 20,
      windowMs: 15 * 60 * 1000,
    });
    expect(hoisted.mockGetDocsContext).toHaveBeenCalledTimes(1);
    expect(hoisted.mockGetTenantContext).toHaveBeenCalledWith('acme');
  });

  it('escalates and returns escalated=true when the user message matches', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    hoisted.mockDetectEscalation.mockReturnValue(true);
    hoisted.mockCallSAM.mockResolvedValue({
      text: 'I will help',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });

    const res = await POST(
      buildRequest({ messages: [{ role: 'user', content: 'I want a refund now' }] })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.escalated).toBe(true);
    expect(hoisted.mockCreateEscalation).toHaveBeenCalledTimes(1);
    expect(typeof hoisted.mockCreateEscalation.mock.calls[0][0]).toBe('string'); // conversationId
    expect(hoisted.mockCreateEscalation.mock.calls[0][1]).toBe(
      'User message matched escalation keywords'
    );
  });
});
