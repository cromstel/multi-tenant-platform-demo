# SECURITY_AUDIT.md — CITGROUP Tenancy System

Security audit report for the multi-tenant Next.js starter. Produced as task
**DOC-003** (see `IMPLEMENTATION_PLAN.md`). This report covers findings SEC-001
through SEC-004 and their remediation status. It is audit-specific and does not
duplicate `SECURITY.md` (the project security policy), which remains unchanged.

No actual secret values appear anywhere in this document — only file paths,
variable names, and secret categories. See "Secrets Handling".

---

## Audit metadata

| Field | Value |
| --- | --- |
| Repository | `multi-tenant-platform-nextjs` |
| Audited modules | `lib/auth/`, `app/middleware.ts`, `app/api/`, `app/auth/admin/login/actions.ts`, `lib/admin-path.ts`, `lib/api.ts`, `lib/password.ts`, `tests/setup.ts`, `.env.example`, `proxy.ts` |
| Related tasks | SEC-001, SEC-002, SEC-003, SEC-004 (all Completed) |
| Companion document | `SECURITY.md` (security policy — not modified by this audit) |

---

## Executive summary

The audit reviewed the authentication, authorisation, API validation, session
handling, and secret-management surface of the CITGROUP tenancy starter.

Four findings (SEC-001–SEC-004) were identified and all four have been
remediated:

| Finding | Severity | Status |
| --- | --- | --- |
| SEC-001 — Hardcoded JWT fallback secret in `lib/auth/jwt.ts` | High | Removed |
| SEC-002 — `lib/auth/role-check.ts` redirected to exposed `/auth/admin/login` | Medium | Fixed |
| SEC-003 — `AUTH_COOKIE` blanket denial (cookie read but never set) | Medium | Fixed |
| SEC-004 — No Zod request-body validation on mutating API routes | Medium | Fixed |

No unpatched production vulnerabilities remain from this audit. One informational
note concerns test fixture defaults in `tests/setup.ts`; these are test-only and
never reach production.

One secret-handling observation: `ADMIN_PATH` and the authentication secrets
are documented in `.env.example` with empty placeholder values. Operators must
populate them in `.env.local` before deploying; the admin area and the JWT
issuer fail closed when they are absent.

---

## Vulnerabilities identified

Each finding below lists severity, file, description, and remediation status.

### SEC-001 — Hardcoded JWT fallback secret (High) — REMOVED

- **File:** `lib/auth/jwt.ts`
- **Severity:** High
- **Description:** A JWT signing/verification secret previously had a hardcoded
  fallback, meaning sessions could be issued/verified with a predictable key
  when `AUTH_JWT_SECRET` was not set. This allowed forging admin sessions.
- **Remediation status:** Removed. `lib/auth/jwt.ts` now reads only
  `process.env.AUTH_JWT_SECRET` (`VERIFY_SECRET`). `issueSession()` throws when
  the secret is unset ("refusing to issue a session"), and `verifyToken()`
  returns `null` when it is unset — fail closed, no fallback. `.env.example`
  documents `AUTH_JWT_SECRET`.

### SEC-002 — role-check redirect exposed the internal admin path (Medium) — FIXED

- **File:** `lib/auth/role-check.ts` (uses `lib/admin-path.ts`)
- **Severity:** Medium
- **Description:** `requireAdminRole()` redirected unauthenticated callers to a
  literal `/auth/admin/login`, which is the internal admin route. While
  `ADMIN_PATH` is configured, `proxy.ts` answers that internal route with a 404,
  so the redirect stranded operators on "Not Found" and revealed the real path.
- **Remediation status:** Fixed. `requireAdminRole()` now redirects via
  `adminUrl('/login')` from `lib/admin-path.ts`, which honours the hidden
  `ADMIN_PATH` when configured and falls back to `/auth/admin/login` otherwise.

### SEC-003 — `AUTH_COOKIE` blanket denial (Medium) — FIXED

- **Files:** `app/middleware.ts` (reads `AUTH_COOKIE`), `app/auth/admin/login/actions.ts` (issues it)
- **Severity:** Medium
- **Description:** Middleware read the `AUTH_COOKIE` cookie on protected routes
  but nothing issued it, so every non-excluded request was redirected to
  `/auth/login` — an effective blanket denial with no valid session path.
- **Remediation status:** Fixed. Session issuance is now wired up:
  `loginAction` in `app/auth/admin/login/actions.ts` issues `AUTH_COOKIE` via
  `issueSession()` (from `lib/auth/jwt.ts`) on successful sign-in and deletes
  it on `logoutAction`. Middleware now has a genuine session path; excluded
  routes (`/`, `/auth/*`, `/admin/*`, public pages, `/api/*`) are unchanged,
  and `/api/` self-authenticates via `requireAdminOrApiKey()` (invariant 7).

### SEC-004 — No Zod validation on mutating API routes (Medium) — FIXED

- **Files:** `app/api/v1/tenants/route.ts`, `app/api/v1/tenants/[subdomain]/route.ts`, `app/api/sam/chat/route.ts`; `lib/api.ts`; `package.json` (zod v4.6.7)
- **Severity:** Medium
- **Description:** Mutating API routes accepted arbitrary JSON bodies without
  schema validation, risking malformed or unsafe payloads reaching the database
  or LLM.
- **Remediation status:** Fixed. `zod` v4.6.7 is a dependency and every
  mutating route validates the body before processing:
  - `POST /api/v1/tenants` — `CreateTenantSchema` (subdomain, emoji, email,
    password; 400 with per-field details on invalid schema)
  - `PATCH/PUT /api/v1/tenants/[subdomain]` — `UpdateTenantSchema`
  - `POST /api/sam/chat` — `SamChatSchema` (messages/session/subdomain)
  Invalid bodies return `400 bad_request` before any database or LLM work.

### Informational — Test fixture secrets in `tests/setup.ts` (test-only, not production)

- **File:** `tests/setup.ts`
- **Description:** `beforeAll()` assigns test-only defaults for environment
  variables so tests exercise configured rather than "unconfigured" branches:
  `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `MYSQL_USER`,
  `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_HOST`, `MYSQL_PORT`,
  `NEXT_PUBLIC_ROOT_DOMAIN`.
- **Remediation status:** Noted. These are local test defaults only, scoped to
  the vitest process, and are never copied to `.env.local` or deployed. Not a
  production vulnerability. (TEST-002 requires "no secret values in test
  fixtures" going forward.)

---

## Remediation actions taken (SEC-001 through SEC-004)

### SEC-001 — Remove hardcoded JWT fallback secret

| Before | After |
| --- | --- |
| `lib/auth/jwt.ts` contained a hardcoded fallback secret used when `AUTH_JWT_SECRET` was absent. | `lib/auth/jwt.ts` reads `process.env.AUTH_JWT_SECRET` only; `issueSession()` throws and `verifyToken()` returns `null` when unset — fail closed. |
| Sessions could be forged with the predictable fallback key. | No fallback secret exists in source. |
| `.env.example` did not document `AUTH_JWT_SECRET`. | `.env.example` documents `AUTH_JWT_SECRET` (generate with `crypto.randomBytes`). |

### SEC-002 — Fix role-check redirect

| Before | After |
| --- | --- |
| `lib/auth/role-check.ts:requireAdminRole()` redirected to literal `/auth/admin/login`. | Redirects via `adminUrl('/login')` from `lib/admin-path.ts`, honouring the hidden `ADMIN_PATH`. |
| Redirect revealed the internal admin path and landed operators on a 404 while `ADMIN_PATH` was set. | Redirect goes to the public admin entry point. |

### SEC-003 — Wire up `AUTH_COOKIE` issuance

| Before | After |
| --- | --- |
| `app/middleware.ts` read `AUTH_COOKIE` but no code set it — blanket denial of protected routes. | `app/auth/admin/login/actions.ts:loginAction` sets `AUTH_COOKIE` (via `issueSession()`) on sign-in; `logoutAction` deletes it. |
| No valid session path existed for middleware-protected routes. | Non-excluded routes now have a genuine session path; `/api/` self-authenticates. |

### SEC-004 — Add Zod validation to mutating API routes

| Before | After |
| --- | --- |
| `zod` not a dependency; API routes parsed JSON bodies without schema validation. | `zod` v4.6.7 added; `CreateTenantSchema`, `UpdateTenantSchema`, and `SamChatSchema` validate bodies before processing. |
| Malformed payloads reached the database/LLM; no structured 400 errors. | Invalid bodies return `400 bad_request` with per-field details. |

---

## Remaining security risks (lower severity — accepted or planned)

These are lower-severity items drawn from `SECURITY.md` ("Known limitations of
this starter") that remain open in the current codebase. None block the audit;
each is accepted for now or has a planned fix.

### Risk 1 — Rate limiter keys on proxy-supplied headers

- **Files:** `lib/api.ts` (`apiClientIdentifier`), `lib/rate-limit.ts`
- **Description:** Counters are keyed on a hash of `X-Forwarded-For` /
  `X-Real-IP`. If the app is reachable directly from the internet, a caller can
  rotate that header and receive a fresh budget per request, reducing both
  limits (admin login, tenant creation) to nothing. The identifier remains only
  as trustworthy as the proxy in front of the app.
- **Status:** Accepted / planned. Fix: key on an address the platform
  guarantees (`request.ip` on a Node server, or the platform header such as
  Vercel/Cloudflare `CF-Connecting-IP`).

### Risk 2 — Tenant creation is unauthenticated

- **File:** `app/actions.ts` (`createSubdomainAction`)
- **Description:** Tenant creation is intentionally public (the landing page
  invites anyone to claim a subdomain) and is rate limited to 10 per hour per
  IP, but it has no CAPTCHA or ownership check. A determined attacker with many
  addresses can still exhaust the subdomain namespace.
- **Status:** Accepted / planned. Fix: add an authentication or
  claim-confirmation step if subdomains are a claimed or paid resource.

### Risk 3 — Single shared admin credential

- **Files:** `app/auth/admin/login/actions.ts` (ensures admin from env), `lib/db/mysql.ts` (`admin_users` table has a `role` column)
- **Description:** One administrator is seeded from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`. There is no per-user identity, no audit trail, and no way to
  revoke one person's access without rotating the secret for everyone. The
  `admin_users.role` column exists but is unpopulated.
- **Status:** Accepted / planned. Fix: swap `app/auth/admin/login/actions.ts`
  for a real identity provider; the DAL boundary means only that module changes.

---

## Secrets handling

**No actual secret values are recorded in this report.** Only variable names,
file paths, and secret categories are listed. Values live exclusively in
`.env.local` (operator-controlled, never committed) and `.env.example`
(documentation placeholders).

### Production secret variables

| Variable | Category | File path(s) |
| --- | --- | --- |
| `ADMIN_PATH` | Admin routing secret (unguessable public path segment) | `.env.example`, `lib/admin-path.ts`, `proxy.ts` |
| `ADMIN_EMAIL` | Admin identity seed | `.env.example`, `app/auth/admin/login/actions.ts` |
| `ADMIN_PASSWORD` | Admin credential | `.env.example`, `app/auth/admin/login/actions.ts` |
| `ADMIN_SESSION_SECRET` | Session signing key (HS256, 32+ chars) | `.env.example`, `app/auth/admin/login/actions.ts` |
| `AUTH_JWT_SECRET` | JWT signing/verification key (fail closed when unset) | `.env.example`, `lib/auth/jwt.ts` |
| `TENANT_SESSION_SECRET` | Optional tenant session key | `.env.example` |
| `API_KEYS` | Machine API keys (`name:secret` pairs, constant-time compare) | `.env.example`, `lib/api.ts` |
| `OPENROUTER_API_KEY` | LLM provider key (SAM chatbot) | `.env.example`, `lib/sam/llm.ts` |
| `CHATGPT_API_KEY` | LLM provider key (SAM chatbot fallback) | `.env.example`, `lib/sam/llm.ts` |
| `SAM_MODEL` | LLM model identifier | `.env.example`, `lib/sam/llm.ts` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Database credentials | `.env.example`, `lib/db/mysql.ts` |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DATABASE` | Database configuration | `.env.example`, `lib/db/mysql.ts` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis / KV credentials (optional) | `.env.example`, `lib/redis.ts` |

### Test-only fixture variables (not production)

- **File:** `tests/setup.ts`
- Variables: `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`,
  `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_HOST`,
  `MYSQL_PORT`, `NEXT_PUBLIC_ROOT_DOMAIN`
- Category: test-only defaults, scoped to the vitest process; never deployed.

### Handling rules observed

- Secrets are read only from `process.env` inside server modules (`server-only`
  where applicable) — never from the browser bundle.
- `ADMIN_SESSION_SECRET` is read exclusively inside
  `app/auth/admin/login/actions.ts` (`getSessionSecret`); no other module reads
  it (invariant 3).
- Cookie secrets/session tokens are written only from Server Actions / Route
  Handlers, never during render (invariant: cookies written from actions).
- The admin URL (`ADMIN_PATH`) is never linked from public pages, never logged,
  and never appears in `robots.txt`/`sitemap.xml` (invariant 6).

---

## Verification

Run from the repository root with `corepack pnpm` (pnpm 10.12.4 pinned).

| Command | Result |
| --- | --- |
| `pnpm check` (`tsc --noEmit && eslint .`) | PASS — 0 errors; 8 pre-existing unused-variable warnings in unrelated files (`app/api/sam/chat/route.ts`, `app/auth/reset/*`) |
| `pnpm test` (`vitest run`) | PASS — 6 test files, 65 tests passed |
| `pnpm build` (`next build`) | PASS — production build succeeded; 24 static pages rendered, proxy middleware active |

No secret values were introduced, logged, or committed during this audit.

---

## Summary

- Vulnerabilities listed: **4** (SEC-001–SEC-004)
- Fixed / remediated: **4**
- Remaining production vulnerabilities: **0**
- Informational test-only note: **1** (`tests/setup.ts`)
- Remaining lower-severity risks: **3** (rate-limiter proxy-header keys;
  unauthenticated tenant creation; single shared admin credential)
- Secret values exposed in this document: **no**
