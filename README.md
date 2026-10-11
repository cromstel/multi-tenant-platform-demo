# Next.js Multi-Tenant Example

A full-stack Next.js 16 application demonstrating subdomain-based multi-tenancy:
each tenant gets their own subdomain, served from a shared deployment and a
single Redis-backed data store.

> **Before using this in production**, read [SECURITY.md](./SECURITY.md). It
> covers what is protected and what is still open — notably the single shared
> admin password and the per-instance login rate limit.

## Features

- ✅ Custom subdomain routing via `proxy.ts` (the Next.js 16 replacement for `middleware.ts`)
- ✅ Tenant-specific content, pages and metadata
- ✅ Admin interface for creating and deleting tenants
- ✅ Emoji branding per tenant, with a searchable picker
- ✅ Upstash Redis storage, with a **zero-config local fallback** so the app runs straight after `git clone`
- ✅ **Password-protected `/admin`** with signed session cookies and brute-force lockout
- ✅ **No hardcoded ports** — every port comes from the environment file
- ✅ Works with `*.localhost` subdomains, no `/etc/hosts` editing required
- ✅ Compatible with Vercel preview deployments
- ✅ Zero WCAG 2.0 A/AA violations in axe-core

## Tech Stack

| Concern            | Choice                                            |
| ------------------ | ------------------------------------------------- |
| Framework          | [Next.js 16](https://nextjs.org/) — App Router, Turbopack |
| UI runtime         | [React 19](https://react.dev/)                    |
| Data store         | [Upstash Redis](https://upstash.com/) + local file fallback |
| Styling            | [Tailwind CSS 4](https://tailwindcss.com/)        |
| Components         | [shadcn/ui](https://ui.shadcn.com/) on Radix primitives |
| Emoji data         | [frimousse](https://www.npmjs.com/package/frimousse) |
| Lint / types       | ESLint 9 (flat config) + TypeScript 5 strict      |

## Getting Started

### Prerequisites

- **Node.js 20.9.0 or later**
- **pnpm 10.12.4** — pinned via `packageManager`. Enable it with
  `corepack enable`. `npm`/`yarn` also work but will generate a second lockfile.
- An Upstash Redis account is **optional** — only needed to use real Redis.

### 1. Install

```bash
git clone https://github.com/vercel/platforms.git
cd platforms
corepack enable
pnpm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

The defaults are enough to run locally — no credentials required:

```env
PORT=3131
KV_REST_API_URL=
KV_REST_API_TOKEN=
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3131
```

### 3. Run

```bash
pnpm dev
```

| URL                                  | What it is              |
| ------------------------------------ | ----------------------- |
| `http://localhost:3131`              | Landing page + creation form |
| `http://localhost:3131/admin/login`  | Admin sign-in           |
| `http://localhost:3131/admin`        | Tenant management (requires sign-in) |
| `http://<tenant>.localhost:3131`     | A tenant's page         |

Replace `3131` if you changed `PORT`. `*.localhost` resolves to `127.0.0.1`
in Chrome, Edge, Firefox and Safari, so no hosts-file entry is needed.

`/admin` is password-protected. Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`
in `.env.local` — without them the admin area denies every request.

## Configuration

**No port is hardcoded in the source.** Every value lives in the environment
file, and `.env.example` documents all of them:

| Variable                        | Required        | Purpose                                                                |
| ------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `PORT`                          | yes             | Port `pnpm dev` / `pnpm start` listen on                              |
| `NEXT_PUBLIC_ROOT_DOMAIN`       | yes             | Host serving the landing page and admin panel, e.g. `localhost:3131`  |
| `ADMIN_PASSWORD`                | yes             | Password for `/admin`, compared in constant time                      |
| `ADMIN_SESSION_SECRET`          | yes             | Random 32+ char string signing the session cookie (HS256)            |
| `KV_REST_API_URL`               | production only | Upstash Redis REST endpoint                                          |
| `KV_REST_API_TOKEN`             | production only | Upstash Redis REST token                                             |
| `LOCAL_KV_FILE`                 | no              | Override the local store's data file (default `.dev-store.json`)     |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`/admin` **fails closed**: if either admin variable is missing, every request is
denied rather than falling open. Rotating `ADMIN_SESSION_SECRET` invalidates
all existing sessions immediately.

### Changing the port

Edit the env file only — no code changes needed:

```env
PORT=8080
NEXT_PUBLIC_ROOT_DOMAIN=localhost:8080
```

Two entries must move together, for two independent reasons.

**1. Next.js ignores `PORT` from `.env*`.** Next.js decides which port to listen
on *before* it loads environment files, so a bare `next dev` silently falls
back to its own default. `scripts/next-env-port.mjs` reads the env file first
and passes the port through:

```
pnpm dev  →  node scripts/next-env-port.mjs dev  →  next dev   (PORT honoured)
```

An explicit flag still wins and skips the drift check below:

```bash
pnpm dev -- --port 4000
```

**2. The port cannot be derived, so it is repeated.** Browsers resolve
`*.localhost` to the loopback interface but take the **port from the hostname
itself**. With `NEXT_PUBLIC_ROOT_DOMAIN=localhost`, every tenant link would
point at `http://acme.localhost/` on port 80 instead of the dev server. The
launcher warns at startup when the two values drift apart:

```
[next-env-port] PORT is 3131 but NEXT_PUBLIC_ROOT_DOMAIN is "localhost:4000" —
                tenant links would point at the wrong port. Make it end with ":3131".
```

In production, set `NEXT_PUBLIC_ROOT_DOMAIN` to your bare domain with no scheme
and no port — the platform terminates TLS on 443.

## Data Storage

`lib/redis.ts` exports a single `redis` object typed as the small `KvClient`
interface (`lib/kv-types.ts`) and selects an implementation at startup:

| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Implementation                       | Data lives in                  |
| ---------------------------------------- | ------------------------------------ | ------------------------------ |
| Both set                                 | `@upstash/redis`                     | Upstash Redis database         |
| Either blank                              | `lib/local-store.ts` (file-backed KV) | `.dev-store.json` (git-ignored) |

The local store implements the same `get` / `set` / `del` / `keys` / `mget` /
`incr` / `expire` surface, persists across dev-server restarts, and deep-clones
values so callers cannot mutate stored objects by reference. It exists so the
project runs immediately after `git clone` — **production and preview
deployments always use Upstash.**

`lib/redis.ts` throws at startup if `NODE_ENV=production` and the Upstash
credentials are missing, rather than silently serving from a throwaway file.
The guard is skipped during `next build`, which also runs with
`NODE_ENV=production` but never touches the store.

Tenant records use the key pattern `subdomain:{name}`:

```json
{
  "subdomain:acme": { "emoji": "🤑", "createdAt": 1791644511020 }
}
```

Delete `.dev-store.json` to reset local data.

## Multi-Tenant Architecture

- Each tenant gets a subdomain (`acme.yourdomain.com`)
- `proxy.ts` maps the incoming `Host` to a tenant and rewrites the request
- The root domain hosts the landing page and the admin panel only
- Subdomains render `app/s/[subdomain]/page.tsx`

Request flow for a tenant visit:

```
GET https://acme.platforms.example.com/
        │
        ▼
   proxy.ts ──── host is a subdomain ────▶ rewrite to /s/acme
        │
        ▼
app/s/[subdomain]/page.tsx ──▶ redis.get('subdomain:acme')
        │
        ▼
   200  renders the tenant page
   404  if the subdomain has no record
```

### Rules the proxy enforces

- `/admin` **and every `/admin/*` path** redirect to `/` on any subdomain, so the
  management UI is only ever served from the root domain
- Tenant URLs are normalised: `http://acme.localhost:3131` and `/` both resolve to
  the same tenant page
- `app/s/[subdomain]/page.tsx` calls `notFound()` when no record exists, and
  `app/not-found.tsx` resolves the tenant name from the `Host` header so the 404
  page can say which subdomain is missing
- Static assets, `/_next/*` and API routes are excluded via the matcher

## Project Structure

```
app/
  actions.ts              Server Actions: create / delete a tenant
  admin/page.tsx          Admin route — calls requireAdmin()
  admin/dashboard.tsx     Admin UI (client component) + sign out
  admin/login/page.tsx    Sign-in screen
  admin/login/actions.ts  loginAction / logoutAction
  admin/login/login-form.tsx
  s/[subdomain]/page.tsx  Tenant page, resolves the record from Redis
  page.tsx                Landing page
  subdomain-form.tsx      Creation form + emoji picker (client component)
  not-found.tsx           404 page, names the missing subdomain
  layout.tsx, globals.css Root layout and design tokens

components/ui/            shadcn/ui primitives
                          (button, card, dialog*, emoji-picker, input, label, popover)
                          * `dialog.tsx` is provided but currently unused

lib/
  auth.ts                 Admin session DAL (server-only) — the auth boundary
  rate-limit.ts           Login brute-force protection
  utils.ts                Protocol, rootDomain (env-driven), `cn()` class helper
  redis.ts                Selects and exports the KvClient implementation
  kv-types.ts             KvClient interface + credential detection
  local-store.ts          File-backed KvClient for local development
  subdomains.ts           Tenant validation, sanitisation and reads

scripts/
  next-env-port.mjs       Starts Next on PORT from the env file (see above)

proxy.ts                  Subdomain detection and rewrites
next.config.ts            Turbopack root pinning
eslint.config.mjs         ESLint 9 flat config
```

## Admin Authentication

`/admin` is protected by a password and an `HttpOnly` session cookie holding an
HS256 JWT (8 hour expiry). `lib/auth.ts` is the Data Access Layer and the only
module that reads `ADMIN_SESSION_SECRET`; it is marked `server-only`.

**Enforcement is duplicated on purpose.** A page-level check does not cover
Server Actions, because they are reachable by direct `POST`:

```tsx
// app/admin/page.tsx — decides what UI renders
await requireAdmin();

// app/actions.ts — the check that actually protects the data
const session = await getSession();
if (!session) return { error: 'Your session has expired.' };
```

Add **both** to any new privileged action. Removing the page-level check is
safe; removing the in-action check is not.

Login is rate limited to 5 failures per IP per 15 minutes, and tenant creation
to 10 per IP per hour. Both counters live in the configured store, so they hold
across every instance rather than resetting per process. See
[SECURITY.md](./SECURITY.md) for what to fix before production.

### Environment variable access

Both `NEXT_PUBLIC_*` and server-only variables are read through
`lib/utils.ts`. Never read `process.env` for a port or host elsewhere — the
launcher and the proxy both depend on a single source of truth, and
`NEXT_PUBLIC_*` values are inlined into the client bundle at build time.

## Scripts

| Script           | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | Dev server on `PORT` from the env file                    |
| `pnpm build`     | Production build                                          |
| `pnpm start`     | Serve the production build on `PORT`                      |
| `pnpm typecheck` | `tsc --noEmit`                                            |
| `pnpm lint`      | ESLint (`next/core-web-vitals` + `next/typescript`)       |
| `pnpm check`     | `typecheck` then `lint` — run before pushing               |

## Quality

Run both before every commit:

```bash
pnpm check
```

- **Types** — strict TypeScript; `tsc --noEmit` must be clean
- **Lint** — `next/core-web-vitals` plus TypeScript rules; no `any`, no
  `setState` inside effects, no unescaped entities
- **Accessibility** — all four routes report **0 axe-core violations** for
  `wcag2a` / `wcag2aa`. Two constraints worth preserving when restyling:
  - body text needs **4.5:1** contrast; `text-gray-500` is only safe on white
    (`#ffffff`), not on the `blue-50` gradient used by the landing and tenant
    pages (`4.44:1`)
  - icon-only buttons need an explicit `aria-label`

  axe reports gradient backgrounds as *incomplete* rather than *violating*, so
  contrast on gradient pages has to be checked by calculation.

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| `/admin` redirects to `/admin/login` and login says "not configured" | `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` missing. Set both in `.env.local` and restart |
| "Too many failed attempts" | 5 failed logins from your IP in 15 minutes. Wait for the window, or delete the `ratelimit:login:*` key from `.dev-store.json` to reset it locally |
| `/admin` returns 307 even after signing in | Session cookie dropped. Check it is not blocked over plain HTTP, and that `NEXT_PUBLIC_ROOT_DOMAIN` matches the host you are visiting |
| All sessions invalid after a deploy | Expected — a new `ADMIN_SESSION_SECRET` invalidates old cookies |
| `[next-env-port] No port configured.` and exit 1 | `.env.local` is missing or has no `PORT`. Run `cp .env.example .env.local` |
| `[next-env-port] PORT is X but NEXT_PUBLIC_ROOT_DOMAIN is "Y"` | The two drifted; make the root domain end in `:X` |
| Server starts on an unexpected port | Another process holds `PORT`. Next.js falls back silently — check the startup banner, or pass `--port` explicitly |
| Tenant URL loads nothing / wrong app | `NEXT_PUBLIC_ROOT_DOMAIN` port does not match `PORT`, so `*.localhost` resolves somewhere else |
| Changes to env vars not picked up | Restart the dev server; Next.js inlines `NEXT_PUBLIC_*` at build time |
| Admin panel is empty after creating tenants | Data went to a different store — confirm whether `KV_REST_API_*` is set, and delete `.dev-store.json` to reset local state |
| `pnpm` not found | `corepack enable`, or `npm i -g pnpm@10.12.4` |
| Native deps fail on install | `pnpm approve-builds` — `sharp`, `@tailwindcss/oxide` and `unrs-resolver` need postinstall scripts |

## Deployment

Designed for Vercel:

1. Push the repository to GitHub and import it into Vercel
2. Create an Upstash Redis database, link it to the project, and confirm
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` are injected
3. Set `NEXT_PUBLIC_ROOT_DOMAIN` to your production domain — bare host, no
   scheme, no port
4. Set `ADMIN_PASSWORD` and a fresh `ADMIN_SESSION_SECRET` (32+ chars) in your
   host's secret manager — **never in git**
5. Work through the hardening checklist in [SECURITY.md](./SECURITY.md)
6. Deploy

For wildcard subdomains, add your root domain to the project and configure a
wildcard DNS record (`*.yourdomain.com`) pointing at Vercel.

Set `PORT` only if your host requires it; Vercel and most PaaS providers inject
it themselves.

## Notes

- `@vercel/analytics` is listed as a dependency but is not currently imported;
  only `@vercel/speed-insights` is mounted, in `app/layout.tsx`
- `next-env.d.ts` is regenerated by Next.js — do not edit it by hand
- `AGENTS.md` carries agent guidance and is extended by `next dev`