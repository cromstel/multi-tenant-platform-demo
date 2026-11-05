# IMPLEMENTATION_PLAN.md — CITGROUP Tenancy System

Generated from `docs/Project Auditor.md` audit (sections 1–6). All task IDs, priorities, and acceptance criteria are evidence-based (verified via parallel discovery subagents).

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
| TEST-001 | Add API route tests (all 8 documented endpoints + `/api/sam/chat`) | P1 | In Progress | `tests/api/` | SEC-004 | Route-level tests pass against test DB |
| TEST-002 | Add auth tests (JWT verify/issue, role-check, admin login actions) | P1 | Not Started | `tests/auth/` | SEC-001 | Auth flows verified; no secret values in test fixtures |
| TEST-003 | Add SAM tests (lib/sam/* + chat route) | P2 | In Progress | `tests/sam/` | DEV-001 | SAM flow tested |
| TEST-004 | Add component tests (jsdom configured but unused) | P2 | Not Started | `tests/components/` | None | At least one component test suite passes |
| TEST-005 | Add Server Action tests (`app/actions.ts`, reset, contact) | P2 | Not Started | `tests/actions/` | DEV-002 | Actions tested with DB |
| DOC-001 | Create `IMPLEMENTATION_STATUS.md` (current implementation status) | P2 | Not Started | `IMPLEMENTATION_STATUS.md` | Audit complete | Status report exists, consistent with codebase |
| DOC-002 | Create `IMPLEMENTATION_PLAN.md` (this file — TODO plan) | P1 | Completed | `IMPLEMENTATION_PLAN.md` | None | This file exists; updated as tasks progress |
| DOC-003 | Create `SECURITY_AUDIT.md` (findings + remediation, secrets redacted) | P1 | Not Started | `SECURITY_AUDIT.md` | SEC-001..SEC-004 | Security report exists; no secret values exposed |
| DOC-004 | Create `ARCHITECTURE.md` (architecture overview, currently missing) | P2 | Not Started | `ARCHITECTURE.md` | Architecture agent findings | Architecture doc exists |
| DOC-005 | Create `CHANGELOG.md` | P3 | Not Started | `CHANGELOG.md` | None | Changelog exists |
| DOC-006 | Document SAM chatbot in README (env vars, public endpoint) | P2 | Not Started | `README.md` | DEV-001 | SAM documented |
| DOC-007 | Update README schema table (6 tables omitted) | P3 | Not Started | `README.md` | None | All 12 tables listed |

## Verification Rules

- `pnpm check` (tsc --noEmit && eslint) clean before every commit
- `pnpm test` (vitest) passes
- `pnpm build` passes
- No secret values in any report or log (auditor section 4, lines 112–115)
- Never mark Complete without verified acceptance criteria
