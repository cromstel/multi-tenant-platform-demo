# SAM Embedded Chatbot — Implementation Plan

## Context
Next.js 16 multi-tenant starter (`lib/db/mysql.ts` source of truth, `proxy.ts` subdomain rewrite, `ADMIN_PATH` hidden admin URL, brand colors `#0078E2`/`#005cb3`). No chat infrastructure exists. User wants floating embedded AI support agent "SAM" using OpenRouter free models + ChatGPT fallback.

## Resolved Design Decisions
- **SAM role**: Platform guide + tenant account support (reads `docs_sections` + current subdomain data).
- **Form factor**: Floating embedded widget (bottom-right overlay), visible on all public pages including subdomains.
- **Persistence**: Full MySQL (`conversations`, `messages`, `escalations` tables). Admin gets review view.
- **LLM stack**: Primary `openrouter.ai/api/v1/chat/completions`; fallback `api.openai.com/v1/chat/completions` (ChatGPT). Raw fetch, no npm package required.
- **Escalation triggers**: User asks for human; SAM fails/confused; sensitive/urgent keywords; message-count/threshold.
- **Admin visibility**: Full conversation/escalation review under hidden `ADMIN_PATH`.
- **Knowledge sources**: System prompt + `docs_sections` table + real-time `tenants` lookup.

## Data Flow (new)
User opens widget → anonymous session cookie (`sam_session`) or email → `messages` stored in MySQL → `openrouter.ai` call with system prompt + docs context + tenant info → response streamed/displayed → escalation creates `escalations` row, sends notification, keeps history.

## Implementation Tasks (ordered)

- [ ] 1. DB schema: `conversations` (id, session, subdomain, created_at, escalated), `messages` (id, conversation_id, role, content, created_at), `escalations` (id, conversation_id, reason, resolved, created_at). Update `lib/db/mysql.ts` schema section.
- [ ] 2. Env vars: `OPENROUTER_API_KEY`, `CHATGPT_API_KEY` (optional), `SAM_MODEL` (default `openrouter/free` or similar). Add to `.env.example`.
- [ ] 3. Lib module `lib/sam/llm.ts`: `callOpenRouter(messages, model?)`, `callChatGPT(messages)`, `callSAM(messages, subdomain?)` — tries OpenRouter, falls back ChatGPT on error/rate-limit.
- [ ] 4. Lib module `lib/sam/knowledge.ts`: `getDocsContext(subdomain?)` queries `docs_sections`; `getTenantContext(subdomain)` from `tenants`; builds system prompt.
- [ ] 5. Lib module `lib/sam/escalation.ts`: `detectEscalation(messages)`, `shouldEscalate(text)`, `createEscalation(convId, reason)`.
- [ ] 6. API route `app/api/sam/chat/route.ts`: POST `{ messages, session?, subdomain? }`. Reads session cookie or creates anonymous. Inserts `conversations`/`messages`. Calls LLM. Returns `{ ok, data: { response, escalated, conversationId } }`. Uses `requireAdminOrApiKey()` only for admin endpoints; chat endpoint is public with rate limit.
- [ ] 7. Rate limit: Add `SAM_LIMIT` to `lib/rate-limit.ts` (backed by `kv_store`). Apply to chat endpoint.
- [ ] 8. Component `components/sam/widget.tsx`: Floating button + overlay. Uses `useState` for open/close and message history. Fetches `/api/sam/chat`. Streams/display responses. ESC button triggers escalation. Accessible: `aria-label`, `aria-live="polite"` on messages, focus trap inside overlay. Brand styling (`#005cb3` buttons, `#0078E2` glow only).
- [ ] 9. Add widget to `app/layout.tsx` (global chrome) or `components/site-header.tsx` / `site-footer.tsx` so it loads everywhere (including subdomain pages via `proxy.ts` rewrite). Ensure `proxy.ts` does not block widget assets.
- [ ] 10. Admin review page `app/admin/sam/page.tsx` (under hidden admin URL via `adminUrl()`). Uses `getAdminSession()`. Queries `escalations` + `messages` with pagination. Calls same session helper as actions.
- [ ] 11. Add chat session cookie (`sam_session`) written only in Server Action or API route (not render). Store session ID mapping to conversation.
- [ ] 12. Verify accessibility (`pnpm check`, axe-core `wcag2aa` on widget + page). Verify build (`pnpm build`). Test subdomain `acme.localhost:3030` renders widget.

## Risks / Failure Modes
- **LLM failure / rate limit**: Fallback to ChatGPT; if both fail, show graceful error + offer escalation.
- **DB deadlock**: `getMySQLPool()` creates schema; never call from `initializeMySQL()` (per AGENTS.md invariant).
- **Admin URL leak**: Never link to `/auth/admin`; widget never reveals admin paths.
- **Contrast failure**: Widget text uses `#005cb3`; decorative elements only use `#0078E2`.

- [ ] 13. Security module `lib/sam/filter.ts`: `sanitizePII(text)`, `containsSecret(text)`, `maskMessage(text)`. Apply before LLM call input and before response return.
- [ ] 14. Security audit: Verify `lib/sam/` modules do not import `.env.local`, do not reference `process.env.ADMIN_SESSION_SECRET`, and do not query admin/session/contact tables. Confirm no secret keys appear in `pnpm check` output, logs, or API response payloads.

## Validation Steps
- `pnpm check` clean; `pnpm test` passes; `pnpm build` passes.
- Browser test on `localhost:3030` and `test.localhost:3030`: widget opens, sends message, receives response, escalation button works.
- Admin review page accessible via `$ADMIN_PATH` only; 404 on `/auth/admin` when `ADMIN_PATH` set.
- axe-core 0 violations on widget overlay and admin review.

## Security / Anti-Leak Guards (new — do not remove)
- **Secrets never enter prompts**: `lib/sam/knowledge.ts` must not read `ADMIN_SESSION_SECRET`, `API_KEYS`, `.env.local`, or any admin session cookie value. Only `docs_sections` + `tenants` columns (public fields) feed the system prompt.
- **DB scope restricted**: `lib/sam/knowledge.ts` queries only `docs_sections` and `tenants` (subdomain/name/icon only). Never query `admin_users`, `admin_sessions`, `contact_enquiries`, or `password_reset_tokens`.
- **LLM provider keys isolated**: `OPENROUTER_API_KEY` and `CHATGPT_API_KEY` live only in `lib/sam/llm.ts` call headers — never concatenated into messages or returned in API responses.
- **Output sanitization**: `lib/sam/filter.ts` runs before returning response to client — strips email patterns, phone patterns, and any subdomain+user combinations that look like PII. If PII detected, mask to `***` and flag for admin review.
- **Admin review masked**: Admin page (`app/admin/sam/page.tsx`) shows messages but masks email/phone fields; full unredacted access requires an explicit `view_raw` flag (not default).
- **Agent execution rule**: Implementation agent must not log secret env values; must not include `.env.local` content in plan/chat; must not send DB secrets to LLM.

## Open Questions (out of scope / deferred)
- Real-time streaming vs. single response payload (use single response first).
- Whether to install `openrouter` npm package later — currently using raw fetch.
- ChatGPT key rotation / cost tracking is operator-managed (env only).
