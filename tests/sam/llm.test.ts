import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { callSAM } from '@/lib/sam/llm';

/**
 * SAM LLM tests.
 *
 * `fetch` is stubbed for every provider call — no real network requests are
 * made. Test keys are deliberately fake and are never real provider keys.
 */

let savedOpenrouter: string | undefined;
let savedChatgpt: string | undefined;
let savedModel: string | undefined;

beforeEach(() => {
  savedOpenrouter = process.env.OPENROUTER_API_KEY;
  savedChatgpt = process.env.CHATGPT_API_KEY;
  savedModel = process.env.SAM_MODEL;
  process.env.OPENROUTER_API_KEY = '';
  process.env.CHATGPT_API_KEY = '';
  delete process.env.SAM_MODEL;
  vi.restoreAllMocks();
});

afterEach(() => {
  if (savedOpenrouter === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = savedOpenrouter;
  }
  if (savedChatgpt === undefined) {
    delete process.env.CHATGPT_API_KEY;
  } else {
    process.env.CHATGPT_API_KEY = savedChatgpt;
  }
  if (savedModel === undefined) {
    delete process.env.SAM_MODEL;
  } else {
    process.env.SAM_MODEL = savedModel;
  }
  vi.restoreAllMocks();
});

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('callSAM', () => {
  it('throws when no LLM provider key is configured', async () => {
    await expect(
      callSAM([{ role: 'user', content: 'Hello' }])
    ).rejects.toThrow(/No LLM provider key configured/);
  });

  it('returns the OpenRouter response with a mocked fetch', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    const mockFetch = stubFetch(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Hello from SAM' } }],
          model: 'meta-llama/llama-3.1-8b-instruct:free',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const result = await callSAM([{ role: 'user', content: 'Hello' }]);

    expect(result).toEqual({
      text: 'Hello from SAM',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      source: 'openrouter',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-or-key'
    );
    // The key is sent to the provider but never echoed back in the response.
    expect(JSON.stringify(result)).not.toContain('test-or-key');
  });

  it('falls back to ChatGPT when OpenRouter fails', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    process.env.CHATGPT_API_KEY = 'test-cg-key';
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Fallback response' } }],
            model: 'gpt-4o-mini',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', mockFetch);

    const result = await callSAM([{ role: 'user', content: 'Hello' }]);

    expect(result).toEqual({
      text: 'Fallback response',
      model: 'gpt-4o-mini',
      source: 'chatgpt',
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws when all providers fail', async () => {
    process.env.OPENROUTER_API_KEY = 'test-or-key';
    const mockFetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(callSAM([{ role: 'user', content: 'Hello' }])).rejects.toThrow(
      /All LLM providers failed/
    );
  });
});
