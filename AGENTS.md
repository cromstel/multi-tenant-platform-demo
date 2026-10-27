# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

CITGROUP TENANCY SYSTEM — a Next.js 16 multi-tenant starter. Tenants are
identified by subdomain (`acme.localhost:3030` locally, `acme.example.com` in
production). `proxy.ts` maps the `Host` header to a tenant record and rewrites
the request to `app/s/[subdomain]/page.tsx`.

## Commands

```bash
pnpm install          # corepack enable first; pnpm@10.12.4 is pinned
cp .env.example .env.local
pnpm dev              # http://localhost:$PORT
pnpm check            # tsc --noEmit && eslint .  — run before every commit
pnpm test             # vitest run
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

**2. MySQL is the source of truth.** `lib/db/mysql.ts` owns the connection pool
and every query helper. Tenant records live in the `tenants` table; the
`kv_store` table backs the `KvClient` counters. Never write tenant data to one
store and read it from the other — the admin dashboard reads MySQL, so a
tenant created in the key/value store is invisible to it.

**3. Authenticate privileged actions in two places.** `/auth/admin` is protected
by `app/auth/admin/login/actions.ts` (session DAL) plus `lib/rate-limit.ts`. A
page-level check does **not** cover Server Actions — they are reachable by
direct POST. So:

- `app/auth/admin/page.tsx` calls `requireAdminSession()` to decide what UI renders
- `app/actions.ts` calls `getAdminSession()` inside `deleteSubdomainAction` and
  `bulkDeleteSubdomainsAction` — these are the checks that protect the data

**Both checks must call the same helper.** They once used different modules
(`lib/auth.ts` vs `app/auth/admin/login/actions.ts`) and therefore read
different cookies, which made every delete fail with "session expired" even
for a signed-in admin. If you add a privileged action, use
`getAdminSession()` from the new module.

**Every new privileged action needs the in-action check.** Removing the page
check is safe; removing the action check is not. Never read
`ADMIN_SESSION_SECRET` outside `app/auth/admin/login/actions.ts`.

The proxy is *not* an authorisation boundary: it redirects `/admin` away from
subdomains, but matcher changes can silently drop coverage.

**4. Tenant records use the key pattern `subdomain:{name}`.** Sanitise on write
(`lib/subdomains.ts:sanitizeSubdomain`) and on read. Reject names that change
under sanitisation rather than silently accepting the cleaned form.

**5. Brand colour is `#0078E2`, in two steps.** The hex value is the brand —
do not substitute a Tailwind `blue-600` for it. But `#0078E2` measures only
**4.39:1** against white, so it can neither carry white text nor body copy.
The scale is:

| Token       | Value     | Where it goes                                                                     |
| ----------- | --------- | --------------------------------------------------------------------------------- |
| brand fill  | `#0078E2` | Decorative glows, tinted chip backgrounds (`bg-[#0078E2]/10`), borders, focus rings |
| brand ink   | `#005cb3` | Blue **text** on light surfaces, and every fill that carries white text (6.6:1)  |
| brand hover | `#004A94` | Hover / active state of the ink                                                   |

A primary button is `bg-[#005cb3] text-white hover:bg-[#004A94]`. Writing
`bg-[#0078E2]` behind white text fails AA at 4.39:1.

**6. The admin URL is hidden.** `ADMIN_PATH` (an env var) is the public entry
point for the admin area. While it is set, `proxy.ts` rewrites `/{ADMIN_PATH}`
onto the real routes and answers `/auth/admin`, `/auth/admin/login`, `/admin`
and `/admin/login` with a **404, not a redirect** — a redirect would hand the
real path back.

Three consequences:

- **Never link to the admin area from a public page.** The header, footer,
  landing page and auth screens are all unlinked. A single stray link undoes
  the whole mechanism.
- **Never reveal `ADMIN_PATH`** in a page body, a comment, a log line or a
  documentation file that ships. It is a secret, and the only copy the
  operator needs is the one in `.env.local`. `app/robots.ts` is exactly such a
  file — robots.txt is public, so it disallows the *internal* paths only. The
  admin pages carry `robots: { index: false }` instead, which keeps them out
  of search indexes without publishing where they live.
- **Never redirect to `/auth/admin` by hand.** While `ADMIN_PATH` is set that
  path answers with a 404, so the redirect lands the operator on "Not Found"
  right after a successful sign-in. Use `adminUrl()` from
  `lib/admin-path.ts` — `adminUrl()` for the dashboard, `adminUrl('/login')`
  for the sign-in page. It returns the hidden path when one is configured and
  `/auth/admin` otherwise. The same module owns `revalidateAdmin()`, which
  invalidates the rewritten path *and* the internal route.

The 404 the proxy returns is a minimal HTML document — `<html lang="en">` and
a `<title>` — because a bare string is not a valid document and an
accessibility audit rightly complains about it.

`proxy.ts` keeps its own copy of the `ADMIN_PATH` parsing rule on purpose: it
runs at the edge and must not import shared modules. `lib/admin-path.ts` is
the single source of truth for everything server-side.

**7. The JSON API has one envelope and one auth path.** Every
response is `{ ok: true, data }` or `{ ok: false, error }`, built by the
helpers in `lib/api.ts`. Authorisation is either the admin session cookie or
a machine key from `API_KEYS` — both checked per request by
`requireAdminOrApiKey()`.

**Every new API route must call `requireAdminOrApiKey()` (or document why it
does not need to) and use `enforceRateLimit()` for anything that creates
data.** The health endpoint is the only unauthenticated route, and it reads
nothing a caller should not see.

**8. Password hashing lives in `lib/password.ts`.** Three modules used to
carry their own copy of the salt-and-compare logic, which is how two of them
drifted apart. Use `hashPassword()` and `verifyPassword()` from there — do
not re-implement them. That module is also the single seam where the
algorithm is upgraded to a memory-hard KDF.

## Conventions

- Server Components by default; add `'use client'` only for interactivity.
  `app/not-found.tsx` deliberately reads `headers()` on the server instead of
  `useEffect` + `window.location`, which would risk a hydration mismatch and
  trips `react-hooks/set-state-in-effect`.
- Server Actions live in `app/actions.ts` (tenants) and
  `app/auth/admin/login/actions.ts` (auth). Type their `prevState` explicitly —
  `no-explicit-any` is an error.
- Cookies can only be written from a Server Action or Route Handler, never
  during render. `loginAction` is an action for exactly that reason.
- `app/auth/admin/login/actions.ts` and `lib/rate-limit.ts` both keep the
  `server-only` import where present. It is what stops the session secret
  reaching the client bundle.
- Rate limiting is backed by `KvClient`, so adding a limit means adding `incr`
  and `expire` to the interface and both implementations. Never reintroduce
  process-local counters; they reset per instance and per restart.
- `lib/redis.ts` throws in production without Upstash credentials. Any guard
  there must exempt `NEXT_PHASE === 'phase-production-build'`, or CI without
  production secrets cannot build.
- `proxy.ts` must not rely on shared modules or globals; it can run at the CDN.
- Never hand-edit `next-env.d.ts`; Next.js regenerates it.

## UI conventions

- The three auth screens share `app/auth/layout.tsx`. Put shared chrome there,
  not in each page. The card is centred in the viewport and scrolls internally
  so a laptop never gets a page-level scrollbar.
- Auth forms hide their labels and use placeholders instead. Every input still
  needs an `id` so the placeholder is the only affordance and screen readers
  get the field name.
- The brand mark is picked with `components/emoji-field.tsx`, never typed into
  a text box. The value lives in a hidden `input[name=icon]`, so it posts
  like any other field. Its accessible name is derived from the visible
  button text (WCAG 2.5.3) — do not add an `aria-label` that restates it.
- Hints and tooltips come from `components/ui/tooltip.tsx`. `FieldHint`
  renders the hint twice — once in the tooltip, once in an `sr-only` span
  referenced by `aria-describedby` — because a tooltip is a visual channel
  only and a screen reader never sees it.
- The scroll progress bar (`components/scroll-progress.tsx`) writes to the DOM
  directly rather than React state — a scroll handler fires on every frame, and
  re-rendering the tree that often is wasteful. Do not convert it to `useState`.
- `components/site-header.tsx` and `components/site-footer.tsx` are the global
  chrome. Every public page that is not an auth screen should render both.
- The contact form (`app/contact/`) validates server-side in
  `app/contact/actions.ts` and stores to `contact_enquiries`. It carries a
  honeypot field (`website`) and a rate limit — keep both if you touch it.
- `getMySQLPool()` creates the schema on first use. **Never call it from
  `initializeMySQL()`** — that function produces the promise `getMySQLPool()`
  awaits, so the call deadlocks. Use the internal `getPool()` there.

## Accessibility is enforced

Every route — landing, contact, sign in, register, the 404, a tenant page and
the admin area — reports **0 axe-core violations** for `wcag2a` / `wcag2aa` /
`wcag21a` / `wcag21aa`. Four rules to preserve when restyling:

- Body text needs **4.5:1** contrast. The brand hex `#0078E2` reaches only
  4.39:1 on white, so blue text uses the ink `#005cb3` (6.6:1) — see
  invariant 5. `text-gray-500` is fine on white but only reaches 4.44:1 on
  the `blue-50` gradient used by the landing, tenant and 404 pages — use
  `text-gray-600` there. Same for `text-blue-500` links → `blue-600`.
- Semantic colours move one step darker, because the lighter step is below
  4.5:1 on white: `green-600` → `green-700` (3.2 → 5.0), `amber-600` →
  `amber-700` (3.2 → 5.0), `emerald-500` → `emerald-600` (2.5 → 3.3, icons
  only need 3:1), `red-500` → `red-600` (3.8 → 4.8).
- Icon-only buttons need an explicit `aria-label`.
- A tooltip is not a label. Anything the user has to be told belongs in the
  DOM — see `FieldHint` under UI conventions.

axe reports gradient backgrounds as *incomplete*, not *violating*, so verify
contrast on those pages by calculation rather than trusting the audit.

## Verify before claiming done

Run `pnpm check`, `pnpm test` and `pnpm build`. All three must be clean and
warning-free. For UI changes, exercise the real flow in a browser —
`*.localhost` subdomains, the admin sign-in, the 404 page, and the emoji
picker — because the test suite cannot see layout, contrast or focus
behaviour.

When touching auth, verify both halves of invariant 3, not just the page.
Use the *public* entry point: `/auth/admin` answers 404 while `ADMIN_PATH`
is set, so it is the wrong thing to probe.

```bash
# read the secret from the env file, do not hardcode it
ADMIN_PATH=$(grep '^ADMIN_PATH=' .env.local | cut -d= -f2)

# anonymous access is blocked, with no data in the body
curl -s -o /dev/null -D - --max-redirs 0 "http://localhost:$PORT/$ADMIN_PATH"
# expect: 307 -> location: /$ADMIN_PATH/login

# and the action itself rejects an unauthenticated POST
# (capture a signed-in delete via a HAR, replay it with no cookie)
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
