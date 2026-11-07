# IMPLEMENTATION_STATUS.md — CITGROUP Tenancy System

Current implementation status report for DOC-001 (see `IMPLEMENTATION_PLAN.md`).
All claims are based on files read in this repository; no secret values are
exposed. This report is a snapshot of the codebase as it exists today.

## 1. Project Overview

**What it is.** CITGROUP TENANCY SYSTEM — a full-stack Next.js 16 application
demonstrating subdomain-based multi-tenancy. Each tenant gets its own subdomain
(`acme.localhost:3030` locally, `acme.example.com` in production), served from a
shared deployment and a single MySQL-backed data store. `proxy.ts` maps the
`Host` header to a tenant record and rewrites the request to
`app/s/[subdomain]/page.tsx`.

**Tech stack** (per `README.md` and `package.json`):

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16 — App Router, Turbopack (`next.config.ts`: `output: 'standalone'`) |
| UI runtime | React 19 |
| Data store | MySQL 8 via `mysql2`; schema auto-created on first use (`lib/db/mysql.ts`) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui on Radix primitives (`components/ui/*`) |
| Emoji data | frimousse |
| Auth tokens | jose — HS256 JWT (`lib/auth/jwt.ts`, `app/auth/admin/login/actions.ts`) |
| Lint / types | ESLint 9 flat config + TypeScript 5 strict |
| Tests | Vitest (`tests/`) |

**Key architectural invariants** (per `AGENTS.md`):

- No hardcoded ports or hosts — every port comes from the env file via
  `lib/utils.ts` (`protocol`, `rootDomain`); `scripts/next-env-port.mjs` reads
  `PORT` before starting Next.js.
- MySQL is the source of truth — `lib/db/mysql.ts` owns the pool and every
  query helper; `kv_store` backs `KvClient` counters.
- Privileged actions authenticated in two places — page-level
  `requireAdminSession()` (`app/auth/admin/page.tsx`) plus in-action
  `getAdminSession()` (`app/actions.ts`), both from the same module
  (`app/auth/admin/login/actions.ts`).
- Tenant records use key pattern `subdomain:{name}`; sanitise on write and read.
- Brand colour `#0078E2` (fill) / `#005cb3` (ink) / `#004A94` (hover).
- Admin URL hidden behind `ADMIN_PATH` via `lib/admin-path.ts` (`adminUrl()`,
  `revalidateAdmin()`); internal paths answer 404, never redirect.
- JSON API envelope `{ ok, data }` / `{ ok, error }` via `lib/api.ts`;
  `requireAdminOrApiKey()` per request; `enforceRateLimit()` for mutating
  routes; `/api/health` unauthenticated.
- Password hashing in `lib/password.ts` only (`hashPassword` /
  `verifyPassword` / `safeEqual`).

## 2. Implementation Status by Component

| Component | Status | Files | Notes |
|-----------|--------|-------|-------|
| Site header | Implemented | `components/site-header.tsx` | Sticky glass-blurred nav, Product dropdown, mobile drawer, no admin link |
| Site footer | Implemented | `components/site-footer.tsx` | Four link columns, social links, status indicator |
| Scroll progress bar | Implemented | `components/scroll-progress.tsx` | 3px bar under header; DOM writes (not state); back-to-top button |
| Scroll-to-top | Implemented | `components/scroll-to-top.tsx` | Client component; suppressed on `/auth/*` and `/admin/*` |
| Floating bar | Implemented | `components/floating-bar.tsx` | Social links (WhatsApp/Email/LinkedIn/Facebook); suppressed on `/auth/*` and `/admin/*` |
| SAM widget | Implemented | `components/sam/widget.tsx` | Client support widget; POSTs to `/api/sam/chat`; escalation notice |
| Emoji field | Implemented | `components/emoji-field.tsx` | Searchable brand-mark picker; value posts via hidden `input[name=icon]` |
| Not-found screen | Implemented | `components/not-found-screen.tsx` | 404; reads `headers()` server-side to name the missing subdomain |
| shadcn/ui primitives | Implemented | `components/ui/button.tsx`, `card.tsx`, `dialog.tsx` (unused), `emoji-picker.tsx`, `input.tsx`, `label.tsx`, `popover.tsx`, `tooltip.tsx` | `tooltip.tsx` provides `FieldHint` (tooltip + `sr-only` span via `aria-describedby`) |
| Subdomain proxy | Implemented | `proxy.ts` | Host→tenant rewrite; admin gating; hidden-path 404; matcher excludes `/api`, `/_next`, static files |
| Auth layout | Implemented | `app/auth/layout.tsx` | Shared auth shell; centred card with internal scroll |
| Admin dashboard | Implemented | `app/auth/admin/page.tsx`, `app/admin/dashboard.tsx` | Stats, search, sorting, pagination, bulk delete, tenant detail modal |
| Member management | Implemented | `app/admin/members/actions.ts`, `MemberManager.tsx` | Invite, role, suspend, remove; last-owner protection |
| Contact form | Implemented | `app/contact/page.tsx`, `form.tsx`, `actions.ts` | Honeypot (`website`), rate limit, server-side validation |
| SAM module | Implemented | `lib/sam/llm.ts`, `filter.ts`, `escalation.ts`, `knowledge.ts` | OpenRouter + ChatGPT fallback; PII redaction; escalation detection; docs/tenant context |
| Tenant service | Implemented | `lib/db/tenants.ts` | Canonical create/read/update/delete/bulk-delete; shared by API and actions |
| API helpers | Implemented | `lib/api.ts` | JSON envelopes, `requireAdminOrApiKey()`, `enforceRateLimit()`, `readJsonBody()` |
| Rate limiter | Implemented | `lib/rate-limit.ts` | Fixed-window, KvClient-backed; login (5/15min), create (10/hr), SAM chat (20/15min) |
| DB pool & schema | Implemented | `lib/db/mysql.ts` | 12 tables created via `CREATE TABLE IF NOT EXISTS`; `KvClient` MySQL driver |
| Admin-path helper | Implemented | `lib/admin-path.ts` | `adminUrl()`, `getAdminPath()`, `revalidateAdmin()`; server-only |
| JWT helper | Implemented | `lib/auth/jwt.ts` | Fail-closed when `AUTH_JWT_SECRET` unset; `issueSession`/`verifyToken` |
| Role check | Implemented | `lib/auth/role-check.ts` | `requireTenantRole`/`requireAdminRole`; redirects via `adminUrl()` |
| Password helper | Implemented | `lib/password.ts` | Salted SHA-256 + constant-time compare (see security gap below) |
| Utils | Implemented | `lib/utils.ts` | `protocol`, `rootDomain` from env; `cn()` class helper |
| KV / store selection | Implemented | `lib/redis.ts`, `kv-types.ts`, `local-store.ts` | Upstash / MySQL `kv_store` / file-backed `.dev-store.json` |
| Subdomain validation | Implemented | `lib/subdomains.ts` | `sanitizeSubdomain`, `isValidIcon`; reject-on-drift |
| SEO builder | Implemented | `lib/seo.ts` | Metadata, canonical URL, JSON-LD schemas, brand colour single source |
| Middleware | Implemented | `app/middleware.ts` | Auth middleware (`AUTH_COOKIE` wiring per SEC-003) |

## 3. Feature Status

| Feature | Implemented? | Files | Gaps |
|---------|--------------|-------|------|
| Custom subdomain routing via `proxy.ts` | Yes | `proxy.ts` | None |
| Tenant-specific content, pages, metadata | Yes | `app/s/[subdomain]/page.tsx`, `lib/seo.ts` | None |
| Admin dashboard (stats, search, sort, pagination, bulk delete, detail modal) | Yes | `app/auth/admin/page.tsx`, `app/admin/dashboard.tsx` | None |
| Emoji branding per tenant | Yes | `components/emoji-field.tsx`, `lib/subdomains.ts` | None |
| MySQL storage with FK-enforced tenant isolation | Yes | `lib/db/mysql.ts`, `lib/db/tenants.ts` | None |
| Password-protected admin, signed session cookies (HS256 JWT, 8h) | Yes | `app/auth/admin/login/actions.ts`, `lib/auth/jwt.ts` | None |
| Brute-force lockout on admin login | Yes | `lib/rate-limit.ts` (5/IP/15min) | Keys on `X-Forwarded-For`/`X-Real-IP` (spoofable) |
| No hardcoded ports | Yes | `lib/utils.ts`, `scripts/next-env-port.mjs` | None |
| `*.localhost` subdomains without `/etc/hosts` | Yes | `proxy.ts` | None |
| Vercel preview deployment compatibility | Yes | `proxy.ts` (handles `*.vercel.app`) | None |
| Marketing landing page + header/footer | Yes | `app/page.tsx`, `components/site-header.tsx`, `site-footer.tsx` | None |
| Scroll progress bar + back-to-top | Yes | `components/scroll-progress.tsx`, `scroll-to-top.tsx` | None |
| Zero WCAG 2.0/2.1 A/AA axe-core violations | Yes (claimed) | All routes | Claimed in README; not re-audited in this session |
| JSON API with single envelope | Yes | `lib/api.ts`, `app/api/v1/*` | None |
| Health endpoint (liveness + DB readiness) | Yes | `app/api/health/route.ts` | None |
| SAM chatbot (OpenRouter + ChatGPT fallback) | Yes | `lib/sam/*`, `app/api/sam/chat/route.ts` | Public endpoint; rate-limited |
| Tenant login / registration | Yes | `app/auth/login/*`, `app/auth/register/*` | Registration creates tenant + owner in one transaction |
| Password reset | Yes | `app/auth/reset/*` | `password_reset_tokens` table exists |
| Contact form (honeypot, rate limit, validation) | Yes | `app/contact/*` | None |
| Member management (last-owner protection) | Yes | `app/admin/members/*` | None |

Component count documented: **8 main components + 8 shadcn/ui primitives = 16 component files**.
Feature count documented: **20 features**.

## 4. Database Schema Status

Twelve tables created via `CREATE TABLE IF NOT EXISTS` in
`lib/db/mysql.ts:initializeMySQL()`. README schema table documents 7 of 12; 5
tables are missing from the README schema table (see `DOC-007` in
`IMPLEMENTATION_PLAN.md`).

| Table | Columns | Indexes | Documented in README? |
|-------|---------|---------|----------------------|
| `kv_store` | `key` VARCHAR(255) PK, `value` JSON NOT NULL, `expires_at` BIGINT NULL, `created_at`, `updated_at` | PK on `key` | Yes |
| `admin_users` | `id` INT AUTO_INCREMENT PK, `email` VARCHAR(255) NOT NULL UNIQUE, `password_hash` VARCHAR(255) NOT NULL, `role` ENUM, `is_active` BOOLEAN, `created_at`, `updated_at` | UNIQUE on `email` | Yes |
| `admin_sessions` | `id` VARCHAR(64) PK, `user_id` INT NOT NULL FK→`admin_users(id)` CASCADE, `expires_at` BIGINT NOT NULL, `created_at` | `idx_admin_sessions_expires` on `expires_at` | Yes |
| `tenants` | `id` INT AUTO_INCREMENT PK, `subdomain` VARCHAR(63) NOT NULL UNIQUE, `emoji` VARCHAR(10) NOT NULL, `created_at`, `updated_at` | UNIQUE on `subdomain` | Yes |
| `tenant_users` | `id` INT AUTO_INCREMENT PK, `tenant_id` INT NOT NULL FK→`tenants(id)` CASCADE, `email` VARCHAR(255) NOT NULL, `first_name`, `last_name`, `password_hash` VARCHAR(255) NOT NULL, `role` ENUM, `is_active` BOOLEAN, `created_at`, `updated_at` | FK `tenant_id` CASCADE; UNIQUE (`tenant_id`, `email`) | Yes |
| `tenant_sessions` | `id` VARCHAR(64) PK, `tenant_id` INT NOT NULL FK→`tenants(id)` CASCADE, `user_id` INT NOT NULL FK→`tenant_users(id)` CASCADE, `expires_at` BIGINT NOT NULL, `created_at` | `idx_tenant_sessions_expires` on `expires_at` | Yes |
| `contact_enquiries` | `id` INT AUTO_INCREMENT PK, `name`, `email`, `company`, `category` ENUM, `subject`, `message` TEXT, `status` ENUM, `created_at`, `updated_at` | `idx_contact_enquiries_status`, `idx_contact_enquiries_created` | Yes |
| `docs_sections` | `id` INT AUTO_INCREMENT PK, `role` ENUM, `title` VARCHAR(255) NOT NULL, `body` TEXT NOT NULL, `sort_order` INT, `created_at`, `updated_at` | `idx_docs_sections_role_sort` on (`role`, `sort_order`) | **No** |
| `password_reset_tokens` | `token` VARCHAR(64) PK, `email` VARCHAR(255) NOT NULL, `user_id` INT NOT NULL FK→`tenant_users(id)` CASCADE, `expires_at` BIGINT NOT NULL, `created_at` | FK `user_id` CASCADE; `idx_password_reset_email_expires` on (`email`, `expires_at`) | **No** |
| `conversations` | `id` VARCHAR(36) PK, `session` VARCHAR(36), `subdomain` VARCHAR(100), `created_at` DATETIME, `escalated` TINYINT | PK on `id` | **No** |
| `messages` | `id` VARCHAR(36) PK, `conversation_id` VARCHAR(36) FK→`conversations(id)`, `role` ENUM('user','assistant'), `content` LONGTEXT, `created_at` DATETIME | FK `conversation_id` | **No** |
| `escalations` | `id` VARCHAR(36) PK, `conversation_id` VARCHAR(36) FK→`conversations(id)`, `reason` VARCHAR(255), `resolved` TINYINT, `created_at` DATETIME | FK `conversation_id` | **No** |

Table count documented: **12 tables** (7 documented in README schema table; 5 not documented).

## 5. API Endpoint Status

All `/api/v1/*` routes call `requireAdminOrApiKey()` (session cookie or
`API_KEYS` machine key) and return the `{ ok, data }` / `{ ok, error }` envelope
from `lib/api.ts`. `/api/health` is the only unauthenticated route. `/api/sam/chat`
is intentionally unauthenticated (documented exception; rate-limited).

| Endpoint | Method | Auth | Rate-limited | Documented? |
|----------|--------|------|--------------|-------------|
| `/api/health` | GET | No | No | Yes (README, SECURITY.md) |
| `/api/v1/tenants` | GET | Session or API key | No | Yes (README) |
| `/api/v1/tenants` | POST | Session or API key | Yes (10/IP/hr) | Yes (README) |
| `/api/v1/tenants/{subdomain}` | GET | Session or API key | No | Yes (README) |
| `/api/v1/tenants/{subdomain}` | PATCH | Session or API key | No | Yes (README) |
| `/api/v1/tenants/{subdomain}` | DELETE | Session or API key | No | Yes (README) |
| `/api/v1/tenants/{subdomain}/users` | GET | Session or API key | No | Yes (README) |
| `/api/v1/stats` | GET | Session or API key | No | Yes (README) |
| `/api/sam/chat` | POST | No (documented) | Yes (20/IP/15min) | Yes (README + code comment) |

Endpoint count documented: **9 endpoints** (8 under `/api/v1` + `/api/health`, plus `/api/sam/chat`).
All mutating API routes use Zod request-body validation (SEC-004):
- `POST /api/v1/tenants` — `CreateTenantSchema` (subdomain, emoji, email, password)
- `PATCH /api/v1/tenants/{subdomain}` — `UpdateTenantSchema` (emoji only)
- `POST /api/sam/chat` — `SamChatSchema` (messages, session, subdomain)

## 6. Test Status

Test runner: Vitest (`pnpm test` runs once). Tests were **not executed in this
session** — the tenant suite requires a live MySQL database (per README the
suite runs against the real DB, not a mock). CI runs the suite against a MySQL
service container. Marked "Not executed" pending a MySQL-backed run.

| Test file | Test count | Pass/fail |
|-----------|-----------|-----------|
| `tests/api/api.test.ts` | 25 | Not executed (requires MySQL) |
| `tests/auth/admin-login.test.ts` | 7 | Not executed (requires MySQL) |
| `tests/auth/jwt.test.ts` | 7 | Not executed (requires MySQL) |
| `tests/auth/role-check.test.ts` | 6 | Not executed (requires MySQL) |
| `tests/faq.test.ts` | 1 | Not executed |
| `tests/password.test.ts` | 13 | Not executed |
| `tests/rate-limit.test.ts` | 3 | Not executed |
| `tests/seo.test.ts` | 22 | Not executed |
| `tests/subdomains.test.ts` | 10 | Not executed |
| `tests/tenants.test.ts` | 17 | Not executed (requires MySQL) |
| `tests/sam/chat.test.ts` | 2 | Not executed (LLM mocked) |
| `tests/sam/escalation.test.ts` | 4 | Not executed |
| `tests/sam/filter.test.ts` | 11 | Not executed |
| `tests/sam/llm.test.ts` | 4 | Not executed (fetch mocked) |
| **Total** | **132** | — |

Test count documented: **132 `it()` declarations across 14 test files** (plus
`tests/stubs/server-only.ts` stub and `tests/setup.ts`). Supporting files:
`vitest.config.mts`.

Coverage gaps relative to `IMPLEMENTATION_PLAN.md`:
- `TEST-004` Component tests — In Progress (`tests/components/` does not yet have a passing suite; jsdom configured but unused per README).
- `TEST-005` Server Action tests — Not Started (`tests/actions/` does not exist).

## 7. Security Status

Summary of `SEC-001`..`SEC-004` remediation (all marked **Completed** in
`IMPLEMENTATION_PLAN.md`):

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| SEC-001 | Remove hardcoded JWT fallback secret; fail closed when `AUTH_JWT_SECRET` unset | Completed | `lib/auth/jwt.ts` — `issueSession` throws when `VERIFY_SECRET === undefined`; `verifyToken` returns null; `.env.example` documents `AUTH_JWT_SECRET` |
| SEC-002 | Fix `role-check.ts` redirect to 404 path via `adminUrl()` | Completed | `lib/auth/role-check.ts` redirects to `adminUrl('/login')`, not `/auth/admin/login` |
| SEC-003 | Wire up `AUTH_COOKIE` session issuance / middleware | Completed | `app/middleware.ts` exists; login actions set both `admin_session` and `AUTH_COOKIE`; `/api/` excluded (self-authenticates) |
| SEC-004 | Zod/request-body validation on all mutating API routes | Completed | All mutating `/api/v1` routes and `/api/sam/chat` use Zod schemas; `package.json` includes `zod` |

Additional security posture (per `SECURITY.md`):

**Implemented protections:**
- Admin authentication: HS256 JWT in `HttpOnly` cookie (8h expiry), fails closed when unconfigured, admin account seeded from env on first sign-in only when credentials match exactly.
- Dual enforcement: page-level `requireAdminSession()` + in-action `getAdminSession()` from the same module (legacy `lib/auth.ts` removed; cookie mismatch fixed).
- Contact form hardened: rate limit (5/IP/hr), honeypot (`website`), server-side validation, parameterised queries, generic errors.
- JSON API authenticated per request via `requireAdminOrApiKey()`; constant-time key comparison.
- Member management preserves the last owner.
- Rate limiting store-backed (KvClient), atomic `incr`, TTL-bounded keys.
- Admin URL hidden behind `ADMIN_PATH`; internal paths answer 404, never redirect; unlinked from public pages; `robots: { index: false }`; `robots.ts` disallows internal paths only.
- Tenant isolation via schema: `tenants.subdomain` UNIQUE, FKs with `ON DELETE CASCADE`.
- Production fails fast without durable store (`lib/redis.ts`, build-exempt).
- Strict CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` in `next.config.ts`.
- `pnpm audit`: 0 critical, 1 high (`braces`, no published fix; lint-time devDependency only).

**Known open limitations (unchecked in `SECURITY.md` hardening checklist):**
- Rate limiter keys on `X-Forwarded-For`/`X-Real-IP` — spoofable when reachable directly from the internet.
- Tenant creation unauthenticated (public landing page); rate-limited but no CAPTCHA/ownership check.
- Subdomain squatting: first-come, first-served with no ownership proof.
- Password hashing is salted SHA-256, not a memory-hard KDF (offline brute-force risk if DB copied).
- Single shared admin credential — no per-user identity, no audit trail, no individual revocation.
- Wildcard DNS and TLS required in production.
- No email transport — member invites return a temporary password instead of emailing it.

## 8. Known Gaps / Outstanding Work

Referenced from `IMPLEMENTATION_PLAN.md` (tasks not marked Completed):

| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| TEST-004 | Add component tests (`tests/components/`) | P2 | In Progress | None |
| TEST-005 | Add Server Action tests (`tests/actions/`) | P2 | Not Started | DEV-002 |
| DOC-001 | Create `IMPLEMENTATION_STATUS.md` | P2 | In Progress (this report) | Audit complete |
| DOC-003 | Create `SECURITY_AUDIT.md` | P1 | Not Started | SEC-001..SEC-004 |
| DOC-004 | Create `ARCHITECTURE.md` | P2 | Not Started | Architecture agent findings |
| DOC-005 | Create `CHANGELOG.md` | P3 | Not Started | None |
| DOC-006 | Document SAM chatbot in README | P2 | Not Started | DEV-001 |
| DOC-007 | Update README schema table (5 tables omitted) | P3 | Not Started | None |

Additional gaps visible in codebase (not all captured in the plan):
- `components/ui/dialog.tsx` is provided but currently unused (noted in README).
- `pnpm audit` residual `braces` advisory cannot be cleared from here (no fix published).
- README claims 64 tests; actual count is 132 `it()` declarations (README count is stale).
- README schema table omits 5 of 12 tables (`docs_sections`, `password_reset_tokens`, `conversations`, `messages`, `escalations`).
- SAM chatbot not yet documented in README (env vars `OPENROUTER_API_KEY`/`CHATGPT_API_KEY`/`SAM_MODEL`, public endpoint).

## Verification

- `pnpm check` (tsc --noEmit && eslint) — not run in this session; required before commit.
- `pnpm test` (vitest) — not executed; requires MySQL for the tenant suite.
- `pnpm build` — not run in this session.

No secret values were read from or written to this report (env values, API keys,
session secrets, and password hashes were deliberately excluded).