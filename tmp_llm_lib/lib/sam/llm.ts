// lib/sam/llm.ts — LLM callers (raw fetch, no key logging, no keys in responses)

export interface Message { role: string; content: string }

export async function callOpenRouter(messages: Message[], model = 'openrouter/auto') {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return { text: data.choices?.[0]?.message?.content ?? '', model, source: 'openrouter' };
}

export async function callChatGPT(messages: Message[]) {
  const key = process.env.CHATGPT_API_KEY;
  if (!key) throw new Error('CHATGPT_API_KEY missing');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
  });
  if (!res.ok) throw new Error(`ChatGPT ${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return { text: data.choices?.[0]?.message?.content ?? '', model: 'gpt-4o-mini', source: 'chatgpt' };
}

export async function callSAM(messages: Message[], subdomain?: string) {
  try {
    return await callOpenRouter(messages);
  } catch {
    return await callChatGPT(messages);
  }
}
