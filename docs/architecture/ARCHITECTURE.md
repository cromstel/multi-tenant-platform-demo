# ARCHITECTURE.md — CITGROUP Tenancy System

Architecture overview for the CITGROUP Tenancy System, a Next.js 16
multi-tenant starter. Every claim below is grounded in the repository's
source files; no secret values are included.

---

## 1. System Overview

**Purpose.** A multi-tenant platform where each tenant is reached through a
subdomain (`acme.localhost:3030` in local development,
`acme.example.com` in production). The landing page lets visitors claim a
subdomain; each tenant gets an isolated subdomain route served by
`app/s/[subdomain]/page.tsx`.

**Multi-tenant subdomain model.** Tenant resolution is driven by the `Host`
header:

- `proxy.ts` (edge middleware) extracts the subdomain from the request host,
  rewrites tenant traffic onto `/s/<subdomain>`, and gates the hidden admin
  area behind `ADMIN_PATH`.
- Tenant records live in the MySQL `tenants` table (`lib/db/mysql.ts`).
- Subdomain names are sanitised on write and read via
  `lib/subdomains.ts:sanitizeSubdomain`, which lowercases and strips anything
  outside `[a-z0-9-]`. Names that change under sanitisation are rejected
  rather than silently accepted.

**Environment-driven configuration.** No port or host is hardcoded. The port
comes from `PORT` (`.env.local`), and `NEXT_PUBLIC_ROOT_DOMAIN` carries the
`host:port` the app is served from (see `lib/utils.ts`). `pnpm dev` and
`pnpm start` route through `scripts/next-env-port.mjs` so `PORT` is honoured;
a bare `next dev` would ignore it.

---

## 2. Request Flow

A request passes through three layers before reaching application code:

```
Client
  │
  ▼
proxy.ts  (edge middleware)
  • extracts subdomain from Host header
  • rewrites /{ADMIN_PATH} → /auth/admin (internal, hidden)
  • 404s /auth/admin and /admin so the real path is never revealed
  • rewrites tenant host → /s/<subdomain>
  • matcher: /((?!api|_next|[\w-]+\.\w+).*)
  │
  ▼
middleware.ts  (auth guard)
  • verifies the AUTH_COOKIE JWT on non-excluded routes
  • redirects unauthenticated callers to /auth/login
  • matcher: /((?!_next/static|_next/image|favicon.ico).*)
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  Route handlers / Server Components / Server Actions        │
│  app/api/*/route.ts      — JSON API                         │
│  app/s/[subdomain]/page.tsx  — tenant page                  │
│  app/admin/*             — admin dashboard                  │
│  app/auth/*              — sign in / register / reset       │
│  app/actions.ts          — tenant create / delete actions   │
└─────────────────────────────────────────────────────────────┘
```

Notes from the source:

- `/api` routes are excluded from the proxy matcher, so API requests bypass
  proxy rewriting and are self-authenticating (each route calls
  `requireAdminOrApiKey()` from `lib/api.ts`).
- Excluded paths in middleware (`/`, `/about`, `/contact`, `/faq`,
  `/services`, `/api`, plus everything under `/auth/` and `/admin/`) pass
  through without a cookie check.

---

## 3. Directory Structure

Top-level ownership:

| Directory / file | Owns |
|---|---|
| `app/` | Next.js App Router: pages, layouts, route handlers, Server Actions, root `layout.tsx`, `middleware.ts`, `not-found.tsx`, `robots.ts`, `sitemap.ts` |
| `app/api/` | JSON API route handlers (`health`, `sam/chat`, `v1/tenants`, `v1/stats`) |
| `app/actions.ts` | Tenant Server Actions: create, single delete, bulk delete |
| `app/auth/admin/login/actions.ts` | Admin session issuance/verification (`getAdminSession`, `requireAdminSession`, `loginAction`, `logoutAction`) |
| `lib/` | Shared server-side modules (auth, db, api, rate-limit, sam, subdomains, admin-path) |
| `lib/db/mysql.ts` | MySQL connection pool, schema auto-creation, all table queries, MySQL-backed `KvClient` |
| `lib/auth/jwt.ts` | `jose`-based JWT issue/verify (`AUTH_JWT_SECRET`, HS256) |
| `lib/password.ts` | Password hashing (`scrypt`), constant-time `safeEqual` |
| `lib/api.ts` | API envelope helpers (`ok`, `fail`), `requireAdminOrApiKey`, `enforceRateLimit` |
| `lib/rate-limit.ts` | Fixed-window rate limiting backed by `KvClient` |
| `lib/redis.ts` | Store driver selection: Upstash → MySQL → local file |
| `lib/sam/` | SAM chatbot: `llm.ts` (OpenRouter + ChatGPT fallback), `filter.ts`, `escalation.ts`, `knowledge.ts` |
| `lib/subdomains.ts` | Subdomain sanitisation and tenant lookup |
| `lib/admin-path.ts` | `adminUrl()`, `getAdminPath()`, `revalidateAdmin()` |
| `lib/utils.ts` | `rootDomain`, `protocol` from environment |
| `components/` | React components: global chrome (`site-header`, `site-footer`), SAM widget, emoji field, scroll progress, tooltip UI |
| `components/sam/widget.tsx` | Embeddable SAM chat widget |
| `proxy.ts` | Edge proxy (runs at the CDN; must not import shared modules) |
| `docker-compose.yml` | Local stack: MySQL 8.4 + app |
| `Dockerfile` | Multi-stage standalone build (node:22-alpine) |
| `next.config.ts` | Next.js config: standalone output, CSP/security headers |
| `tests/` | Vitest suites (api, auth, sam) |
| `scripts/` | `next-env-port.mjs` launcher |
| `seed/` | Seed data |

---

## 4. Authentication & Session Model

Three session types coexist, each with its own cookie and verification path:

| Session | Cookie | Secret | Verified by | TTL |
|---|---|---|---|---|
| Admin session | `admin_session` (httpOnly, SameSite=lax, secure in prod) | `ADMIN_SESSION_SECRET` | `getAdminSession()` in `app/auth/admin/login/actions.ts` (jose `jwtVerify`, issuer `multi-tenant-admin`) | 8h |
| `AUTH_COOKIE` | `AUTH_COOKIE` (httpOnly, SameSite=lax, secure in prod) | `AUTH_JWT_SECRET` | `middleware.ts` via `verifyToken()` from `lib/auth/jwt.ts` | 7d |
| Tenant session | row in `tenant_sessions` table | `TENANT_SESSION_SECRET` (falls back to `ADMIN_SESSION_SECRET`) | MySQL-backed session rows | per-row `expires_at` |

An anonymous `sam_session` cookie is also set by `app/api/sam/chat/route.ts` for unauthenticated SAM conversations.

**Admin login flow** (`app/auth/admin/login/actions.ts`):

1. `loginAction` is a Server Action (cookies can only be written from an
   action or route handler, never during render).
2. Rate-limited: `check("admin_login", LOGIN_LIMIT)` — 5 attempts per IP per
   15 minutes (`lib/rate-limit.ts`).
3. Password verified against `admin_users` via `verifyPassword()` from
   `lib/password.ts`. On first matching sign-in the admin account is created
   from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (`ensureAdminUser`).
4. Two cookies are set: the `admin_session` JWT (signed with
   `ADMIN_SESSION_SECRET`) and `AUTH_COOKIE` (issued via `issueSession()`
   from `lib/auth/jwt.ts`, signed with `AUTH_JWT_SECRET`) so the middleware
   guard recognises the session on protected routes.
5. Redirects through `adminUrl()` from `lib/admin-path.ts`, never to a
   literal `/auth/admin`, because the internal path returns 404 while
   `ADMIN_PATH` is set.

**Middleware guard** (`app/middleware.ts`):

- Excluded paths pass through. Every other path requires a valid
  `AUTH_COOKIE`; missing or invalid tokens redirect to `/auth/login`.
- `verifyToken()` returns `null` when `AUTH_JWT_SECRET` is unset — the app
  fails closed (`lib/auth/jwt.ts`).

Privileged Server Actions re-check the session inside the action itself
(`getAdminSession()` in `deleteSubdomainAction` and
`bulkDeleteSubdomainsAction` in `app/actions.ts`), because a page-level check
does not cover direct POST to a Server Action.

---

## 5. Data Layer

**MySQL is the source of truth.** `lib/db/mysql.ts` owns the `mysql2/promise`
connection pool (`getMySQLPool()`) and every query helper.

**Schema auto-creation.** On first use, `getMySQLPool()` runs
`initializeMySQL()`, which issues `CREATE TABLE IF NOT EXISTS` for every
table. A fresh checkout needs only an empty database — no migration step.
The DDL runs once per process (memoised via `schemaPromise`); concurrent
first-requests await the same DDL instead of racing.

**Tables** (all created by `initializeMySQL()`):

| Table | Purpose |
|---|---|
| `kv_store` | Key/value store backing rate-limit counters (`KvClient`) |
| `admin_users` | Administrator accounts (email, password hash, role) |
| `admin_sessions` | Admin session rows (id, user_id, expires_at) |
| `tenants` | Tenant records (subdomain, emoji) |
| `tenant_users` | Tenant users (email, password hash, role, tenant_id) |
| `tenant_sessions` | Tenant session rows |
| `contact_enquiries` | Contact form submissions |
| `docs_sections` | Knowledge-base sections for SAM context |
| `password_reset_tokens` | Password reset tokens |
| `conversations` | SAM conversations |
| `messages` | SAM messages |
| `escalations` | SAM escalations |

**KvClient.** Defined in `lib/kv-types.ts` (`get`, `set`, `del`, `keys`,
`mget`, `incr`, `expire`). Three drivers in `lib/redis.ts`, in priority order:

1. Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) — production /
   Vercel.
2. MySQL-backed store (`createMySQLStore()`, counters in `kv_store`) — shared
   across instances, survives restarts.
3. Local file store (`.dev-store.json`) — single developer machine only.

In production (`NODE_ENV === production`, excluding `NEXT_PHASE ===
phase-production-build`) the app throws if neither Upstash nor MySQL is
configured — it refuses to silently degrade to the throwaway local store.

**Password hashing** lives exclusively in `lib/password.ts`: scrypt (memory-hard
KDF) with a random salt, stored as `salt:hash` hex, compared with
`timingSafeEqual`. `safeEqual` is the constant-time string comparator used by
API key validation (`lib/api.ts` imports it from `lib/password.ts`).

---

## 6. API Design

**Envelope.** Every JSON response is `{ ok: true, data }` or
`{ ok: false, error: { code, message, details? } }`, built by the helpers in
`lib/api.ts` (`ok`, `fail`, `apiErrors`). Responses send `Cache-Control:
no-store` and `X-Content-Type-Options: nosniff`.

**Authorisation.** `requireAdminOrApiKey()` accepts either:

- the admin session cookie (`requireAdminCookie` → `getAdminSession()`), or
- a machine key from `API_KEYS` (`name:secret` pairs, comma-separated,
  presented as `Authorization: Bearer` or `x-api-key`, compared with
  `safeEqual`).

Machine keys are for integrations; the cookie is for the dashboard.

**Rate limiting.** `enforceRateLimit(prefix, max, windowMs)` is applied to
anything that creates data. Named limits in `lib/rate-limit.ts`:

- `LOGIN_LIMIT`: 5 failed admin logins per IP per 15 minutes.
- `SAM_LIMIT`: 20 SAM chat requests per IP per 15 minutes.
- `CREATE_LIMIT`: 10 tenant creations per IP per hour.

Client identity is a SHA-256 hash of `x-forwarded-for` / `x-real-ip`, taken
from `headers()` (route handlers) or `request.cookies`/`request.headers`
(Server Actions read the incoming `NextRequest`).

**Endpoints:**

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/health` | GET | none (only unauthenticated route) | Liveness/readiness probe; checks MySQL reachability |
| `/api/v1/tenants` | GET | session or API key | List tenants |
| `/api/v1/tenants` | POST | session or API key + rate limit | Create tenant + owner (Zod-validated body) |
| `/api/v1/tenants/[subdomain]` | GET | session or API key | Tenant detail |
| `/api/sam/chat` | POST | none (public, rate limited) | SAM chat; Zod-validated body, anonymous `sam_session` cookie |
| `/api/v1/stats` | GET | session or API key | Platform stats |

All mutating API routes validate request bodies with Zod schemas before
processing (400 on invalid schema). Request bodies are never logged.

---

## 7. Frontend Architecture

**Server Components by default.** `'use client'` is added only for
interactivity. `app/not-found.tsx` reads `headers()` on the server rather
than `useEffect` + `window.location`, avoiding hydration mismatch.

**Server Actions.** `app/actions.ts` (tenant create / single delete / bulk
delete) and `app/auth/admin/login/actions.ts` (admin login / logout /
session helpers). Each `prevState` is typed explicitly (`no-explicit-any` is
an error). Actions authorise internally via `getAdminSession()`.

**Client components.** Used where interactivity is required:
`components/sam/widget.tsx` (SAM chat widget), `components/emoji-field.tsx`
(brand mark picker), `components/scroll-progress.tsx` (writes to the DOM
directly, not React state), `components/scroll-to-top.tsx`, and the
`components/ui/` tooltip primitives.

**Global chrome.** `components/site-header.tsx` and
`components/site-footer.tsx` render on every public page that is not an
auth screen. The three auth screens share `app/auth/layout.tsx`; the card is
centred in the viewport and scrolls internally. Auth forms hide labels and
use placeholders, but every input still has an `id` for screen readers.

**Admin area.** `app/admin/page.tsx`, `dashboard.tsx`, plus `login/`,
`members/`, `sam/`, `settings/` sub-routes. Reachable only through the hidden
`/{ADMIN_PATH}`; the internal `/auth/admin` and legacy `/admin` paths answer
404. The admin area is unlinked from every public page and marked noindex
(`robots: { index: false }` on admin pages; `app/robots.ts` disallows
internal paths only).

---

## 8. Security Model

**Content Security Policy.** Defined in `next.config.ts` `headers()`:
`default-src 'self'`, `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
`style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`,
`font-src 'self'`, `connect-src 'self'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`,
`upgrade-insecure-requests`. Also `Strict-Transport-Security`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive
`Permissions-Policy`. `poweredByHeader` is disabled.

**Cookies.** Session cookies are `httpOnly`, `SameSite=lax`, and `secure` in
production, with `path: "/"` and an explicit `maxAge`.

**Rate limiting.** Fixed-window counters backed by the shared `KvClient` so
limits hold across instances; `incr` is atomic. Limits on login, SAM chat,
and tenant creation (see section 6).

**Hidden admin URL.** `ADMIN_PATH` (env var) is the only public entry point
to the admin area. `proxy.ts` rewrites `/{ADMIN_PATH}` onto the internal
`/auth/admin` routes and answers those internal routes with a minimal HTML
404 (so an accessibility audit passes) — never a redirect, which would leak
the real path. `lib/admin-path.ts` owns `adminUrl()` and
`revalidateAdmin()`; `proxy.ts` keeps its own copy of the parsing rule
because it runs at the edge and cannot import shared modules.

**Secret hygiene.** No secret values appear in source, reports, logs, or
docs. `ADMIN_SESSION_SECRET`, `AUTH_JWT_SECRET`, `ADMIN_PASSWORD`,
`API_KEYS`, `OPENROUTER_API_KEY`, `CHATGPT_API_KEY` are env-only. The SAM
PII filter (`lib/sam/filter.ts`) redacts emails, phone numbers, Bearer
tokens, `sk-` keys, and known secret names from messages; LLM keys are never
logged or returned.

**Brand colour.** `#0078E2` is the brand fill (decorative only, never behind
white text — it measures 4.39:1 on white). Blue text uses ink `#005cb3`
(6.6:1). See invariant 5 of the repo `AGENTS.md`.

---

## 9. Deployment

**Docker standalone.** `next.config.ts` sets `output: 'standalone'`, which
emits a self-contained server with only the imported modules. `outputFileTracingIncludes`
ensures the `mysql2` native bindings are traced into the bundle.

**Dockerfile.** Multi-stage (`deps` → `build` → `runtime`) on
`node:22-alpine`. The runtime stage copies only `.next/standalone`,
`.next/static`, and `public`, runs as `node`, uses `tini` as entrypoint, and
serves `server.js`. It exposes port 3030 and includes a HEALTHCHECK that
polls `/api/health`.

**docker-compose.yml.** Two services: `mysql` (`mysql:8.4`, healthchecked via
`mysqladmin ping`) and `app` (depends on healthy MySQL). The app healthcheck
fetches `http://127.0.0.1:3030/api/health`. Development defaults are used for
secrets and must be overridden in a `.env` file outside a laptop.

**Local development.** `pnpm dev` / `pnpm start` route through
`scripts/next-env-port.mjs`, which reads `PORT` from the env file. `cp
.env.example .env.local` then `pnpm dev` serves on `http://localhost:3030`.

**CI.** `pnpm check` (`tsc --noEmit && eslint .`), `pnpm test` (vitest),
and `pnpm build` must all be clean and warning-free before a commit. The
production build guards `lib/redis.ts` against missing Upstash/MySQL
credentials via `NEXT_PHASE === 'phase-production-build'` so CI can build
without production secrets.

---

## 10. Known Technical Debt

Tracked in `IMPLEMENTATION_PLAN.md`. Completed DEV tasks (all verified):

- DEV-001: SAM LLM integration wired (`lib/sam/llm.ts` — OpenRouter +
  ChatGPT fallback; `app/api/sam/chat/route.ts`).
- DEV-002: `deleteTenant` unified in `lib/db/tenants.ts` (kv_store + MySQL
  both cleaned).
- DEV-003: `bulkDeleteSubdomainsAction` unified with
  `lib/db/tenants.ts:bulkDeleteTenants`.
- DEV-004: `safeEqual` unified — `lib/api.ts` imports from `lib/password.ts`.
- DEV-005: Duplicate `CREATE INDEX IF NOT EXISTS idx_docs_sections_role_sort`
  DDL removed.

Open tasks relevant to architecture (from `IMPLEMENTATION_PLAN.md`):

- TEST-004: Component tests — `tests/components/`, at least one suite
  (In Progress).
- TEST-005: Server Action tests — `tests/actions/` (Not Started).
- DOC-001: `IMPLEMENTATION_STATUS.md` (Not Started).
- DOC-003: `SECURITY_AUDIT.md` (Not Started).
- DOC-005: `CHANGELOG.md` (Not Started).
- DOC-006: Document SAM chatbot in `README.md` (Not Started).
- DOC-007: Update README schema table to list all 12 tables (Not Started).

`lib/password.ts` notes scrypt is the single seam where the hashing algorithm
can be upgraded (currently a salted KDF; the module comment acknowledges it is
not yet a memory-hard KDF in some historical paths, with `hashPassword` as the
upgrade point).

---

*Document ends. No secret values are present in this file.*