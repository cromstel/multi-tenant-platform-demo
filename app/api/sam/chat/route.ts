import { randomBytes, randomUUID } from 'node:crypto';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';

import { getMySQLPool } from '@/lib/db/mysql';
import { SAM_LIMIT, consume } from '@/lib/rate-limit';
import { ok, fail, apiErrors, readJsonBody } from '@/lib/api';
import { callSAM } from '@/lib/sam/llm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Validation schema for `POST /api/sam/chat`.
 *
 * `messages` is optional and defaults to `[]`; `session` and `subdomain` are
 * optional overrides. A malformed body is rejected with a 400 before any
 * database or LLM work.
 */
const SamChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  session: z.string().optional(),
  subdomain: z.string().optional(),
});

/**
 * POST /api/sam/chat
 *
 * PUBLIC endpoint — no admin session or API key required. SAM is an embedded
 * support agent for all visitors; rate limiting (consume) prevents abuse.
 * Per AGENTS.md invariant 7, intentionally unauthenticated (documented).
 *
 * Accepts { messages, session?, subdomain? }. Creates or continues a SAM
 * conversation in MySQL, calls the SAM LLM, and writes back an anonymous
 * `sam_session` cookie when none was provided. Request bodies are never
 * logged.
 */
export async function POST(request: NextRequest) {
  // Rate limit backed by kv_store via the shared consume/check pattern.
  const rateResult = await consume('sam_chat', SAM_LIMIT);
  if (!rateResult.allowed) {
    return apiErrors.rateLimited(rateResult.retryAfterSeconds);
  }

  // Read cookie from the incoming NextRequest, not from render-time headers().
  const existingCookie = request.cookies.get('sam_session')?.value;
  const sessionCookieValue = existingCookie || randomBytes(16).toString('hex');

  const rawBody = await readJsonBody<Record<string, unknown>>(request);

  if (!rawBody) {
    return apiErrors.badRequest('Request body must be valid JSON.');
  }

  const parsed = SamChatSchema.safeParse(rawBody);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path =
        issue.path.length > 0 ? issue.path.join('.') : 'body';
      details[path] = issue.message;
    }
    return apiErrors.badRequest('Invalid request body.', details);
  }

  const { messages = [], session = null, subdomain = null } = parsed.data;

  // Use the cookie session (anonymous) unless the caller provides an override.
  const sessionId = session || sessionCookieValue;

  // Never log the request body; only reference safe, non-secret fields.
  const conversationId = randomUUID();

  try {
    const pool = await getMySQLPool();

    // Insert the conversation row.
    await pool.execute(
      'INSERT INTO conversations (id, session, subdomain) VALUES (?, ?, ?)',
      [conversationId, sessionId, subdomain]
    );

    // Persist user messages.
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') continue;
      const msgObj = msg as Record<string, unknown>;
      const role = msgObj.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof msgObj.content === 'string' ? msgObj.content : '';
      await pool.execute(
        'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
        [randomUUID(), conversationId, role, content]
      );
    }

    // Call SAM LLM via the assumed module.
    const llmResponse = await callSAM(messages);

    // Persist assistant message.
    await pool.execute(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      [randomUUID(), conversationId, 'assistant', llmResponse.text]
    );

    const response = ok({
      conversationId,
      session: sessionId,
      subdomain: subdomain,
      messages: messages.length,
      response: {
        text: llmResponse.text,
        model: llmResponse.model,
        source: llmResponse.source,
      },
    });

    // Write anonymous session cookie via NextResponse (only when missing).
    if (!existingCookie) {
      (response as NextResponse).cookies.set('sam_session', sessionCookieValue, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    // Do not log request bodies or secrets. Log only the error class/message.
    console.error('[sam/chat] Error:', error instanceof Error ? error.message : 'Unknown error');
    return apiErrors.serverError();
  }
}
