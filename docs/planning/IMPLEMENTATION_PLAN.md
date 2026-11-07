# IMPLEMENTATION_PLAN.md — CITGROUP Tenancy System

Generated from `docs/audit/Project-Auditor.md` audit (sections 1–6). All task IDs, priorities, and acceptance criteria are evidence-based (verified via parallel discovery subagents).

## Categories

- **SEC** — Security vulnerabilities & remediation (P0/P1 first)
- **DEV** — Missing functionality & implementation gaps
- **TEST** — Testing & quality assurance
- **DOC** — Documentation & reporting
- **ARCH** — Architecture & code quality

## Task Plan

| ID | Task | Priority | Status | Files | Dependencies | Acceptance Criteria |
|----|------|----------|--------|-------|--------------|---------------------|
| SEC-001 | Remove hardcoded JWT fallback secret in `lib/auth/jwt.ts`; fail closed when `AUTH_JWT_SECRET` unset | P0 | Completed | `lib/auth/jwt.ts`, `.env.example` | None | `pnpm check` clean; fallback secret absent from source; `.env.example` documents `AUTH_JWT_SECRET` |
| SEC-002 | Fix `lib/auth/role-check.ts` redirect to 404 path; use `adminUrl('/login')` from `lib/admin-path.ts` | P1 | Completed | `lib/auth/role-check.ts`, `lib/admin-path.ts` | None | Redirect points to hidden admin path, not `/auth/admin/login` |
| SEC-003 | `AUTH_COOKIE` middleware reads cookie never set — wire up session issuance or remove blanket denial | P1 | Completed | `app/middleware.ts`, `lib/auth/jwt.ts`, `app/auth/login/actions.ts`, `app/auth/admin/login/actions.ts` | SEC-001 | Non-excluded routes have a valid session path; not a blanket denial; `/api/` excluded (self-authenticates) |
| SEC-004 | Add Zod/request-body schema validation to all mutating API routes | P2 | Completed | `app/api/*/route.ts`, `lib/api.ts`, `package.json`, `pnpm-lock.yaml` | SEC-001 | JSON bodies validated before processing; 400 on invalid schema; zod v4.6.7 audit clean |
| DEV-001 | Wire up SAM LLM integration (currently stub returning `'SAM response'`) | P1 | Completed | `lib/sam/llm.ts`, `app/api/sam/chat/route.ts` | None | `OPENROUTER_API_KEY`/`CHATGPT_API_KEY`/`SAM_MODEL` read; non-stub response; OpenRouter + ChatGPT fallback |
| DEV-002 | Unify `deleteTenant` implementations (`app/actions.ts` vs `lib/db/mysql.ts`/`lib/db/tenants.ts`) | P2 | Completed | `app/actions.ts`, `lib/db/mysql.ts`, `lib/db/tenants.ts` | None | Single canonical delete path in tenants.ts; kv_store + MySQL both cleaned |
| DEV-003 | Unify `bulkDeleteSubdomainsAction` with `lib/db/tenants.ts:bulkDeleteTenants` | P2 | Completed | `app/actions.ts`, `lib/db/tenants.ts` | DEV-002 | Single canonical bulk-delete path in tenants.ts |
| DEV-004 | Unify `safeEqual` (`lib/password.ts` vs `lib/api.ts`) | P3 | Completed | `lib/password.ts`, `lib/api.ts` | None | Single canonical constant-time compare; lib/api.ts imports from lib/password.ts |
| DEV-005 | Remove duplicate `CREATE INDEX IF NOT EXISTS idx_docs_sections_role_sort` DDL | P3 | Completed | `lib/db/mysql.ts` | None | Index created once |
| TEST-001 | Add API route tests (all 8 documented endpoints + `/api/sam/chat`) | P1 | Completed | `tests/api/api.test.ts` | SEC-004 | 25 route-level tests pass against test DB; 146 total tests pass |
| TEST-002 | Add auth tests (JWT verify/issue, role-check, admin login actions) | P1 | Completed | `tests/auth/jwt.test.ts`, `tests/auth/role-check.test.ts`, `tests/auth/admin-login.test.ts` | SEC-001 | 20 auth tests pass; no secret values in fixtures |
| TEST-003 | Add SAM tests (lib/sam/* + chat route) | P2 | Completed | `tests/sam/filter.test.ts`, `tests/sam/escalation.test.ts`, `tests/sam/llm.test.ts`, `tests/sam/chat.test.ts` | DEV-001 | 36 SAM tests pass; fetch mocked (no network) |
| TEST-004 | Add component tests (jsdom configured but unused) | P2 | Completed | `tests/components/scroll-to-top.test.tsx`, `tests/components/sam-widget.test.tsx`, `tests/components/floating-bar.test.tsx` | None | 12 component tests pass; 182 total tests pass |
| TEST-005 | Add Server Action tests (`app/actions.ts`, reset, contact) | P2 | Completed | `tests/actions/tenant-actions.test.ts`, `tests/actions/contact-actions.test.ts`, `tests/actions/reset-actions.test.ts` | DEV-002 | 24 action tests pass against real MySQL |
| DOC-001 | Create `IMPLEMENTATION_STATUS.md` (current implementation status) | P2 | Completed | `IMPLEMENTATION_STATUS.md` | Audit complete | 221 lines, 9 sections, all counts documented |
| DOC-002 | Create `IMPLEMENTATION_PLAN.md` (this file — TODO plan) | P1 | Completed | `IMPLEMENTATION_PLAN.md` | None | This file exists; updated as tasks progress |
| DOC-003 | Create `SECURITY_AUDIT.md` (findings + remediation, secrets redacted) | P1 | Completed | `SECURITY_AUDIT.md` | SEC-001..SEC-004 | 204 lines, 4 vulnerabilities fixed, no secrets exposed |
| DOC-004 | Create `ARCHITECTURE.md` (architecture overview, currently missing) | P2 | Completed | `ARCHITECTURE.md` | Architecture agent findings | 380 lines, 10 sections |
| DOC-005 | Create `CHANGELOG.md` | P3 | Completed | `CHANGELOG.md` | None | 37 lines, Keep a Changelog format, 28 entries |
| DOC-006 | Document SAM chatbot in README (env vars, public endpoint) | P2 | Completed | `README.md` | DEV-001 | SAM section, 4 env vars, POST /api/sam/chat endpoint |
| DOC-007 | Update README schema table (6 tables omitted) | P3 | Completed | `README.md` | None | All 12 tables now documented |

## Verification Rules

- `pnpm check` (tsc --noEmit && eslint) clean before every commit
- `pnpm test` (vitest) passes
- `pnpm build` passes
- No secret values in any report or log (auditor section 4, lines 112–115)
- Never mark Complete without verified acceptance criteria
