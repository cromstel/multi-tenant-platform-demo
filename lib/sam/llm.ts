// SAM LLM integration.
//
// Tries OpenRouter first, falls back to ChatGPT (OpenAI-compatible) on error.
// Reads OPENROUTER_API_KEY and CHATGPT_API_KEY from env. Fails closed with a
// descriptive error when both are missing — keys are never logged or returned.
//
// Returns { text, model, source }.

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CHATGPT_BASE_URL = 'https://api.openai.com/v1/chat/completions';

// Sensible default when SAM_MODEL is not set. OpenRouter is tried first, so the
// default is a free OpenRouter model.
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

export type SAMSource = 'openrouter' | 'chatgpt';

export type SAMResponse = {
  text: string;
  model: string;
  source: SAMSource;
};

function configuredKeys(): { openrouter?: string; chatgpt?: string } {
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  const chatgpt = process.env.CHATGPT_API_KEY?.trim();
  return {
    openrouter: openrouter || undefined,
    chatgpt: chatgpt || undefined,
  };
}

/** ChatGPT (OpenAI-compatible) model, resolved from SAM_MODEL with a fallback. */
function chatGptModel(): string {
  return process.env.SAM_MODEL?.trim() || 'gpt-4o-mini';
}

async function callOpenRouter(
  messages: unknown,
  model: string
): Promise<SAMResponse> {
  const { openrouter } = configuredKeys();
  if (!openrouter) {
    throw new Error('OpenRouter API key is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openrouter}`,
    },
    body: JSON.stringify({ model, messages }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return extractText(data, model, 'openrouter');
}

async function callChatGPT(messages: unknown): Promise<SAMResponse> {
  const { chatgpt } = configuredKeys();
  if (!chatgpt) {
    throw new Error('ChatGPT API key is not configured.');
  }

  const model = chatGptModel();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(CHATGPT_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${chatgpt}`,
    },
    body: JSON.stringify({ model, messages }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`ChatGPT request failed (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return extractText(data, model, 'chatgpt');
}

function extractText(
  data: Record<string, unknown>,
  requestedModel: string,
  source: SAMSource
): SAMResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const first = choices?.[0];
  const message = first?.message as Record<string, unknown> | undefined;
  const text = typeof message?.content === 'string' ? message.content : '';
  const model =
    typeof data.model === 'string' ? data.model : requestedModel;
  return { text, model, source };
}

/**
 * Generate a SAM response. Tries OpenRouter first, falls back to ChatGPT on
 * any error (including rate limits). Throws when no provider key is configured
 * or all providers fail. Never logs API keys or request bodies.
 */
export async function callSAM(messages: unknown): Promise<SAMResponse> {
  const keys = configuredKeys();
  if (!keys.openrouter && !keys.chatgpt) {
    throw new Error(
      'No LLM provider key configured: set OPENROUTER_API_KEY or CHATGPT_API_KEY.'
    );
  }

  const model = process.env.SAM_MODEL?.trim() || DEFAULT_MODEL;

  // Try OpenRouter first.
  if (keys.openrouter) {
    try {
      return await callOpenRouter(messages, model);
    } catch {
      // Fall through to ChatGPT below.
    }
  }

  // Fall back to ChatGPT.
  if (keys.chatgpt) {
    try {
      return await callChatGPT(messages);
    } catch {
      // Fall through to the final error below.
    }
  }

  throw new Error('All LLM providers failed.');
}
