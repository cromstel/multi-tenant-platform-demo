# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

A Next.js 16 multi-tenant starter. Tenants are identified by subdomain
(`acme.localhost:3131` locally, `acme.example.com` in production). `proxy.ts`
maps the `Host` header to a tenant record and rewrites the request to
`app/s/[subdomain]/page.tsx`.

## Commands

```bash
pnpm install          # corepack enable first; pnpm@10.12.4 is pinned
cp .env.example .env.local
pnpm dev              # http://localhost:$PORT
pnpm check            # tsc --noEmit && eslint .  — run before every commit
pnpm build
pnpm start
```

`pnpm dev` and `pnpm start` route through `scripts/next-env-port.mjs`, which
reads `PORT` from the env file. Do **not** replace them with a bare `next dev` —
Next.js chooses its port before loading `.env*`, so a bare invocation silently
ignores `PORT` and falls back to 3000.

## Invariants — do not break these

**1. No hardcoded ports or hosts.** Every port comes from the environment file.
Read `rootDomain` and `protocol` from `lib/utils.ts`; never read
`process.env.PORT` or build a `localhost:...` string elsewhere. `proxy.ts`,
`app/actions.ts` and the launcher all depend on these being consistent.

`NEXT_PUBLIC_ROOT_DOMAIN` must include the port during local development. Browsers
resolve `*.localhost` to loopback but read the port from the hostname, so
`localhost` alone would send tenants to port 80. Keep it in sync with `PORT`;
the launcher warns when they drift.

**2. `lib/redis.ts` is the only data access path.** Import the exported `redis`
object rather than constructing a client. Call sites depend on the `KvClient`
interface in `lib/kv-types.ts` (`get` / `set` / `del` / `keys` / `mget`), so
either implementation stays swappable.

**3. Authenticate privileged actions in two places.** `/admin` is protected by
`lib/auth.ts` (session DAL, `server-only`) plus `lib/rate-limit.ts`. A page-level
check does **not** cover Server Actions — they are reachable by direct POST. So:

- `app/admin/page.tsx` calls `requireAdmin()` to decide what UI renders
- `app/actions.ts` calls `getSession()` inside `deleteSubdomainAction` — this is
  the check that actually protects the data

**Every new privileged action needs the in-action check.** Removing the page
check is safe; removing the action check is not. Never read `ADMIN_SESSION_SECRET`
outside `lib/auth.ts`, and never add a dependency that bypasses the DAL.

The proxy is *not* an authorisation boundary: it redirects `/admin` away from
subdomains, but matcher changes can silently drop coverage.

**4. Tenant records use the key pattern `subdomain:{name}`.** Sanitise on write
(`lib/subdomains.ts:sanitizeSubdomain`) and on read. Reject names that change
under sanitisation rather than silently accepting the cleaned form.

## Conventions

- Server Components by default; add `'use client'` only for interactivity.
  `app/not-found.tsx` deliberately reads `headers()` on the server instead of
  `useEffect` + `window.location`, which would risk a hydration mismatch and
  trips `react-hooks/set-state-in-effect`.
- Server Actions live in `app/actions.ts` (tenants) and
  `app/admin/login/actions.ts` (auth). Type their `prevState` explicitly —
  `no-explicit-any` is an error.
- Cookies can only be written from a Server Action or Route Handler, never
  during render. `loginAction` is an action for exactly that reason.
- `lib/auth.ts` and `lib/rate-limit.ts` both `import 'server-only'`. Keep it
  that way — it is what stops the session secret reaching the client bundle.
- Rate limiting is backed by `KvClient`, so adding a limit means adding `incr`
  and `expire` to the interface and both implementations. Never reintroduce
  process-local counters; they reset per instance and per restart.
- `lib/redis.ts` throws in production without Upstash credentials. Any guard
  there must exempt `NEXT_PHASE === 'phase-production-build'`, or CI without
  production secrets cannot build.
- `proxy.ts` must not rely on shared modules or globals; it can run at the CDN.
- Never hand-edit `next-env.d.ts`; Next.js regenerates it.

## Accessibility is enforced

All four routes report **0 axe-core violations** for `wcag2a` / `wcag2aa`.
Two rules to preserve when restyling:

- Body text needs **4.5:1** contrast. `text-gray-500` is fine on white but only
  reaches 4.44:1 on the `blue-50` gradient used by the landing, tenant and 404
  pages — use `text-gray-600` there. Same for `text-blue-500` links → `blue-600`.
- Icon-only buttons need an explicit `aria-label`.

axe reports gradient backgrounds as *incomplete*, not *violating*, so verify
contrast on those pages by calculation rather than trusting the audit.

## Verify before claiming done

Run `pnpm check` and `pnpm build`. Both must be clean and warning-free. For UI
changes, exercise the real flow in a browser — `*.localhost` subdomains, the
admin sign-in, the 404 page, and the emoji picker — since none of it is covered
by tests. This repository has **no test suite**; `pnpm check` and a manual pass
are the current quality gate.

When touching auth, verify both halves of invariant 3, not just the page:

```bash
# anonymous access is blocked, with no data in the body
curl -s -o /dev/null -D - --max-redirs 0 http://localhost:$PORT/admin
# expect: 307 -> location: /admin/login

# and the action itself rejects an unauthenticated POST
# (capture a signed-in delete via a HAR, replay it with no cookie)
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->