# CITGROUP TENANCY SYSTEM

A full-stack Next.js 16 application demonstrating subdomain-based multi-tenancy:
each tenant gets their own subdomain, served from a shared deployment and a
single MySQL-backed data store.

> **Before using this in production**, read [SECURITY.md](./SECURITY.md). It
> covers what is protected and what is still open — notably the single shared
> admin password and the per-instance login rate limit.

## Features

- ✅ Custom subdomain routing via `proxy.ts` (the Next.js 16 replacement for `middleware.ts`)
- ✅ Tenant-specific content, pages and metadata
- ✅ Admin dashboard with stats, search, sorting, pagination, bulk delete and a tenant detail modal
- ✅ Emoji branding per tenant, with a searchable picker
- ✅ MySQL storage with foreign-key-enforced tenant isolation
- ✅ **Password-protected `/auth/admin`** with signed session cookies and brute-force lockout
- ✅ **No hardcoded ports** — every port comes from the environment file
- ✅ Works with `*.localhost` subdomains, no `/etc/hosts` editing required
- ✅ Compatible with Vercel preview deployments
- ✅ Modern marketing landing page with global header nav, product dropdown and footer
- ✅ Scroll progress bar and back-to-top control
- ✅ Zero WCAG 2.0 A/AA violations in axe-core

## Tech Stack

| Concern            | Choice                                            |
| ------------------ | ------------------------------------------------- |
| Framework          | [Next.js 16](https://nextjs.org/) — App Router, Turbopack |
| UI runtime         | [React 19](https://react.dev/)                    |
| Data store         | [MySQL 8](https://www.mysql.com/) via `mysql2`     |
| Styling            | [Tailwind CSS 4](https://tailwindcss.com/)        |
| Components         | [shadcn/ui](https://ui.shadcn.com/) on Radix primitives |
| Emoji data         | [frimousse](https://www.npmjs.com/package/frimousse) |
| Auth tokens        | [jose](https://github.com/panva/jose) — HS256 JWT  |
| Lint / types       | ESLint 9 (flat config) + TypeScript 5 strict      |

## Getting Started

### Prerequisites

- **Node.js 20.9.0 or later**
- **pnpm 10.12.4** — pinned via `packageManager`. Enable it with
  `corepack enable`. `npm`/`yarn` also work but will generate a second lockfile.
- **MySQL 8** (or MariaDB 10.6+) running locally with a database and user.

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

Then point the app at your database:

```env
PORT=3030
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=multi_tenant_admin
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=multi_tenant
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3030

ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your-admin-password
ADMIN_SESSION_SECRET=a-64-char-random-string
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

The schema is created automatically on first use — the app issues
`CREATE TABLE IF NOT EXISTS` for every table it needs.

### 3. Run

```bash
pnpm dev
```

| URL                                  | What it is                        |
| ------------------------------------ | --------------------------------- |
| `http://localhost:3030`              | Landing page + tenant creation    |
| `http://localhost:3030/contact`      | Contact & support                 |
| `http://localhost:3030/auth/login`   | Tenant sign in                    |
| `http://localhost:3030/auth/register`| Create a new tenant               |
| `http://<tenant>.localhost:3030`     | A tenant's page                   |
| `http://<tenant>.localhost:3030/dashboard` | A tenant's dashboard       |
| `http://localhost:3030/{ADMIN_PATH}` | Administrator sign in (see below) |

Replace `3030` if you changed `PORT`. `*.localhost` resolves to `127.0.0.1`
in Chrome, Edge, Firefox and Safari, so no hosts-file entry is needed.

### The admin area is hidden

The administrator area is not linked from any public page, is marked
`noindex`, and is absent from `sitemap.xml`. Its public entry point is
`ADMIN_PATH` — an unguessable segment you choose:

```env
ADMIN_PATH=ops-7f3a9c2b4e
```

While it is set, `proxy.ts` rewrites `/{ADMIN_PATH}` onto the real routes and
answers the real routes with a **404**, not a redirect:

| Request                | Response |
| ---------------------- | -------- |
| `/{ADMIN_PATH}`        | Admin sign in |
| `/{ADMIN_PATH}/dashboard` | Admin dashboard |
| `/auth/admin`          | 404 |
| `/auth/admin/login`    | 404 |
| `/admin`               | 404 |
| `/admin/login`         | 404 |

Generate a path with:

```bash
node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
```

Leave `ADMIN_PATH` blank to disable the gating and use `/auth/admin` directly —
useful for local debugging, not for anything reachable from the internet.

Two things follow from the 404:

- **Do not redirect to `/auth/admin` by hand.** That path answers with a 404
  while `ADMIN_PATH` is set, so the redirect strands the operator on "Not
  Found" right after a successful sign-in. Use `adminUrl()` from
  `lib/admin-path.ts` — it returns the hidden path when one is configured and
  `/auth/admin` otherwise. The same module owns `revalidateAdmin()`.
- **`robots.txt` does not name the hidden path.** robots.txt is public, so
  publishing `ADMIN_PATH` there would undo the whole mechanism. The file
  disallows the internal `/auth/admin` and `/admin` paths only; the admin
  pages carry `robots: { index: false }` in their metadata, which keeps them
  out of search indexes without publishing where they live.

## Configuration

**No port is hardcoded in the source.** Every value lives in the environment
file, and `.env.example` documents all of them:

| Variable                        | Required        | Purpose                                                                |
| ------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `PORT`                          | yes             | Port `pnpm dev` / `pnpm start` listen on                              |
| `NEXT_PUBLIC_ROOT_DOMAIN`       | yes             | Host serving the landing page and admin panel, e.g. `localhost:3030`  |
| `MYSQL_HOST`                    | yes             | Database host                                                          |
| `MYSQL_PORT`                    | yes             | Database port (default `3306`)                                        |
| `MYSQL_USER`                    | yes             | Database user                                                          |
| `MYSQL_PASSWORD`                | yes             | Database password                                                      |
| `MYSQL_DATABASE`                | yes             | Database name                                                          |
| `ADMIN_PATH`                    | yes             | Unguessable path segment for the admin area — see below              |
| `ADMIN_EMAIL`                   | yes             | Email of the site administrator account                               |
| `ADMIN_PASSWORD`                | yes             | Password for the administrator account, compared in constant time      |
| `ADMIN_SESSION_SECRET`          | yes             | Random 32+ char string signing the session cookie (HS256)            |
| `TENANT_SESSION_SECRET`         | no              | Separate secret for tenant sessions (falls back to `ADMIN_SESSION_SECRET`) |

`/auth/admin` **fails closed**: if either admin variable is missing, every
request is denied rather than falling open. Rotating `ADMIN_SESSION_SECRET`
invalidates all existing sessions immediately.

The admin account is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on the
first successful sign-in. The seed only runs when both submitted values match
the environment exactly, so a wrong guess cannot create a backdoor account.

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
[next-env-port] PORT is 3030 but NEXT_PUBLIC_ROOT_DOMAIN is "localhost:4000" —
                tenant links would point at the wrong port. Make it end with ":3030".
```

In production, set `NEXT_PUBLIC_ROOT_DOMAIN` to your bare domain with no scheme
and no port — the platform terminates TLS on 443.

## Data Storage

MySQL is the source of truth. `lib/db/mysql.ts` owns the connection pool and
exposes the query helpers the app uses:

| Helper                          | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `getMySQLPool()`                | Shared pool; creates the schema on first use     |
| `initializeMySQL()`             | Creates every table with `IF NOT EXISTS`         |
| `getAdminTenants()`             | Paginated, searchable, sortable tenant list      |
| `getAdminStats()`               | Dashboard metrics                                |
| `getTenantDetails()`            | One tenant plus its member roster                |
| `deleteTenant()`                | Deletes a tenant and its dependents              |
| `bulkDeleteTenants()`           | Deletes many tenants in one transaction          |
| `createMySQLStore()`            | `KvClient` implementation backed by `kv_store`   |

The schema is created **automatically on first use** — a fresh checkout needs
nothing but an empty database. The DDL runs exactly once per process; a
module-level promise makes concurrent first-requests share that one run
instead of racing.

### Schema

| Table               | Holds                                                     |
| ------------------- | --------------------------------------------------------- |
| `tenants`           | One row per tenant — `subdomain`, `emoji`, timestamps     |
| `tenant_users`      | Members of a tenant, with `role` and `password_hash`     |
| `tenant_sessions`   | Issued tenant sessions                                     |
| `admin_users`       | Site administrator accounts, with `role`                   |
| `admin_sessions`    | Issued administrator sessions                              |
| `kv_store`          | Key/value rows backing the `KvClient` counters            |
| `contact_enquiries` | Support and sales enquiries from the contact form         |

`tenants.subdomain` is `UNIQUE`, so two simultaneous signups cannot claim
the same name — the database rejects the loser.

Tenant records use the key pattern `subdomain:{name}` in the key/value store,
and the `tenants` table in MySQL. Both are written on creation and cleaned up
on deletion so the two stay in step.

### Counter store

`lib/redis.ts` exports a single `redis` object typed as the small `KvClient`
interface (`lib/kv-types.ts`) and selects a driver at startup:

| Configuration                              | Driver              | Data lives in                  |
| ------------------------------------------ | ------------------- | ------------------------------ |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN`   | Upstash Redis       | Upstash Redis database         |
| `MYSQL_HOST` + `MYSQL_DATABASE`           | MySQL               | `kv_store` table               |
| Neither                                    | File-backed KV      | `.dev-store.json` (git-ignored) |

The MySQL driver is the one that matters here: counters land in the same
durable, shared store as the tenant data, so rate limits hold across every
instance instead of resetting per process. The file driver is the last
resort and only correct for a single developer machine.

In production, a durable store is **required** — the app throws at startup
rather than silently serving from a throwaway file. The guard is skipped
during `next build`, which also runs with `NODE_ENV=production` but never
touches the store.

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
app/s/[subdomain]/page.tsx ──▶ tenants table lookup
        │
        ▼
   200  renders the tenant page
   404  if the subdomain has no record
```

### Rules the proxy enforces

- `/admin` **and every `/admin/*` path** redirect to `/` on any subdomain, so the
  management UI is only ever served from the root domain
- Tenant URLs are normalised: `http://acme.localhost:3030` and `/` both resolve to
  the same tenant page
- `/dashboard` on a subdomain rewrites to the tenant's dashboard route
- `app/s/[subdomain]/page.tsx` calls `notFound()` when no record exists, and
  `app/not-found.tsx` resolves the tenant name from the `Host` header so the 404
  page can say which subdomain is missing
- Static assets, `/_next/*` and API routes are excluded via the matcher

## Project Structure

```
app/
  actions.ts              Server Actions: create / delete / bulk-delete a tenant
  page.tsx                Landing page — hero, platform, architecture, security, FAQ
  layout.tsx              Root layout, metadata, fonts
  globals.css             Design tokens + Tailwind layers
  not-found.tsx           404 page, names the missing subdomain
  robots.ts               Robots policy — disallows the admin area
  sitemap.ts              Sitemap — public routes and tenant pages only
  icon.svg                Favicon — CITGROUP tenancy mark
  apple-icon.tsx          180x180 PNG for iOS (generated at build)
  opengraph-image.tsx     1200x630 social share card
  twitter-image.tsx       X card variant
  manifest.ts             Web app manifest
  sitemap.ts              Sitemap — public routes and tenant pages only
  subdomain-form.tsx      Tenant creation form + emoji picker (client component)
  contact/
    page.tsx              Contact & support — hero, channels, form, offices, FAQ
    form.tsx              Enquiry form (client component)
    actions.ts            submitContactAction — validation, rate limit, storage
  api/
    health/route.ts       Liveness and database readiness probe
    v1/
      tenants/             Tenant CRUD
        route.ts
        [subdomain]/route.ts
        [subdomain]/users/route.ts
      stats/route.ts       Platform metrics
  auth/
    layout.tsx            Shared auth shell — full-viewport, no page scroll
    login/                Tenant sign in
    register/             Tenant registration
    admin/login/          Administrator sign in
    admin/page.tsx        Admin dashboard
  admin/
    dashboard.tsx         Admin UI (client component): stats, table, bulk actions
    members/
      actions.ts          Member management (invite, role, suspend, remove)
      MemberManager.tsx    Member management modal
  s/[subdomain]/
    page.tsx              Tenant landing page
    dashboard/page.tsx    Tenant dashboard

components/
  site-header.tsx         Global sticky navigation + product dropdown + mobile menu
  site-footer.tsx         Global footer with link columns and status
  scroll-progress.tsx     Scroll progress bar + back-to-top button
  ui/                     shadcn/ui primitives
                          (button, card, dialog*, emoji-picker, input, label, popover)
                          * `dialog.tsx` is provided but currently unused

lib/
  api.ts                 JSON API helpers: envelopes, auth, rate limits
  password.ts            Password hashing and constant-time comparison
  db/
    mysql.ts              Pool, schema creation, query helpers
    tenants.ts            Tenant service layer shared by API and actions
  auth.ts                 Legacy admin session DAL (server-only)
  rate-limit.ts           Login brute-force protection
  utils.ts                Protocol, rootDomain (env-driven), `cn()` class helper
  redis.ts                Selects and exports the KvClient implementation
  kv-types.ts             KvClient interface + credential detection
  local-store.ts          File-backed KvClient for local development
  subdomains.ts           Tenant validation, sanitisation and reads
  db/mysql.ts             MySQL pool, schema, and query helpers

scripts/
  next-env-port.mjs       Starts Next on PORT from the env file (see above)

proxy.ts                  Subdomain detection and rewrites
next.config.ts            Turbopack root pinning + allowed dev origins
eslint.config.mjs         ESLint 9 flat config
```

## Admin Authentication

The admin area lives at `/auth/admin` internally and at `/{ADMIN_PATH}` in
practice — see [the admin area is hidden](#the-admin-area-is-hidden). It is
protected by a password and an `HttpOnly` session cookie holding an HS256 JWT
(8 hour expiry). `app/auth/admin/login/actions.ts` is the Data Access Layer
and the only module that reads `ADMIN_SESSION_SECRET`.

**Enforcement is duplicated on purpose.** A page-level check does not cover
Server Actions, because they are reachable by direct `POST`:

```tsx
// app/auth/admin/page.tsx — decides what UI renders
await requireAdminSession();

// app/actions.ts — the check that actually protects the data
const session = await getAdminSession();
if (!session) return { error: 'Your session has expired.' };
```

Both must use the **same** helper. They used to read different cookies
(`platforms_admin_session` vs `admin_session`), which made every delete fail
with "session expired" even for a signed-in administrator.

Add **both** to any new privileged action. Removing the page-level check is
safe; removing the in-action check is not.

Login is rate limited to 5 failures per IP per 15 minutes, and tenant creation
to 10 per IP per hour. Both counters live in the durable store, so they hold
across every instance rather than resetting per process. See
[SECURITY.md](./SECURITY.md) for what to fix before production.

## User Interface

- **Global header** (`components/site-header.tsx`) — sticky, glass-blurred, with
  anchor navigation, a Product dropdown, and a mobile drawer.
- **Global footer** (`components/site-footer.tsx`) — four columns, social links,
  and a live status indicator.
- **Scroll progress** (`components/scroll-progress.tsx`) — a 3px bar under the
  header that tracks scroll position, plus a back-to-top button. The bar is
  written straight to the DOM, so scrolling never re-renders the React tree.
- **Contact page** (`app/contact/`) — a full enquiry funnel: hero, support
  channels, a validated form, regional offices and an FAQ. Enquiries land in
  the `contact_enquiries` table.
- **Auth screens** — all three share `app/auth/layout.tsx`. The card is centred
  in the viewport and scrolls internally, so a laptop never gets a page-level
  scrollbar. Labels are hidden and replaced with placeholders, and the
  password fields carry a tooltip with a hint on what makes a good one.
- **Brand mark picker** — `components/emoji-field.tsx` replaces the old
  free-text icon box. The value posts through a hidden `input[name=icon]`, so
  the form carries it like any other field.
- **Tooltips** — `components/ui/tooltip.tsx`. `FieldHint` renders the hint
  twice: in the tooltip and in an `sr-only` span referenced by
  `aria-describedby`, because a tooltip is a visual channel only and a screen
  reader never sees it.
- **Brand colour** — `#0078E2` for fills, `#005cb3` for text and for any fill
  behind white text. See [changing the branding](#changing-the-branding).

### Environment variable access

Both `NEXT_PUBLIC_*` and server-only variables are read through
`lib/utils.ts`. Never read `process.env` for a port or host elsewhere — the
launcher and the proxy both depend on a single source of truth, and
`NEXT_PUBLIC_*` values are inlined into the client bundle at build time.

## Scripts

| Script              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `pnpm dev`          | Dev server on `PORT` from the env file                    |
| `pnpm build`        | Production build                                          |
| `pnpm start`        | Serve the production build on `PORT`                      |
| `pnpm typecheck`    | `tsc --noEmit`                                            |
| `pnpm lint`         | ESLint (`next/core-web-vitals` + `next/typescript`)       |
| `pnpm check`        | `typecheck` then `lint` — run before pushing               |
| `pnpm test`         | Vitest — run once                                         |
| `pnpm test:watch`   | Vitest in watch mode                                      |
| `pnpm test:coverage`| Vitest with a coverage report                             |

## Quality

Run all three before every commit:

```bash
pnpm check
pnpm test
pnpm build
```

- **Types** — strict TypeScript; `tsc --noEmit` must be clean
- **Lint** — `next/core-web-vitals` plus TypeScript rules; no `any`, no
  `setState` inside effects, no unescaped entities
- **Tests** — 64 tests over the password helper, subdomain sanitisation, the
  SEO builder, the rate limiter and the tenant lifecycle against the real
  database
- **Accessibility** — every route reports **0 axe-core violations** for
  `wcag2a` / `wcag2aa` / `wcag21a` / `wcag21aa`. Four constraints worth
  preserving when restyling:
  - body text needs **4.5:1** contrast; `text-gray-500` is only safe on white
    (`#ffffff`), not on the `blue-50` gradient used by the landing and tenant
    pages (`4.44:1`)
  - the brand hex `#0078E2` is only 4.39:1 on white — blue text uses the ink
    `#005cb3` (6.6:1)
  - semantic colours move one step darker (`green-600` → `green-700`,
    `amber-600` → `amber-700`, `emerald-500` → `emerald-600`, `red-500` →
    `red-600`); the lighter step is below 4.5:1
  - icon-only buttons need an explicit `aria-label`

  axe reports gradient backgrounds as *incomplete* rather than *violating*, so
  contrast on gradient pages has to be checked by calculation.

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| `/{ADMIN_PATH}` shows "Not Found" | `ADMIN_PATH` in the env file does not match the path you are visiting. It is case sensitive and must be a single segment |
| The admin sign-in lands on "Not Found" after a successful login | A redirect targets `/auth/admin` directly. Use `adminUrl()` from `lib/admin-path.ts` instead |
| `/auth/admin` returns 404 | Expected while `ADMIN_PATH` is set — the internal path is deliberately hidden. Use `/{ADMIN_PATH}` |
| The admin sign-in says "not configured" | `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` / `ADMIN_EMAIL` missing. Set all three in `.env.local` and restart |
| "Too many failed attempts" | 5 failed logins from your IP in 15 minutes. Wait for the window, or delete the `ratelimit:login:*` row from `kv_store` to reset it locally |
| The admin area returns 307 even after signing in | Session cookie dropped. Check it is not blocked over plain HTTP, and that `NEXT_PUBLIC_ROOT_DOMAIN` matches the host you are visiting |
| All sessions invalid after a deploy | Expected — a new `ADMIN_SESSION_SECRET` invalidates old cookies |
| `[next-env-port] No port configured.` and exit 1 | `.env.local` is missing or has no `PORT`. Run `cp .env.example .env.local` |
| `[next-env-port] PORT is X but NEXT_PUBLIC_ROOT_DOMAIN is "Y"` | The two drifted; make the root domain end in `:X` |
| Server starts on an unexpected port | Another process holds `PORT`. Next.js falls back silently — check the startup banner, or pass `--port` explicitly |
| Tenant URL loads nothing / wrong app | `NEXT_PUBLIC_ROOT_DOMAIN` port does not match `PORT`, so `*.localhost` resolves somewhere else |
| `ER_ACCESS_DENIED_ERROR` on startup | MySQL rejected the credentials. Check `MYSQL_USER` / `MYSQL_PASSWORD` and that the user can reach the host |
| `ER_BAD_DB_ERROR` on startup | The database in `MYSQL_DATABASE` does not exist. Create it, then restart |
| Changes to env vars not picked up | Restart the dev server; Next.js inlines `NEXT_PUBLIC_*` at build time |
| Admin panel is empty after creating tenants | The app wrote to a different database — confirm `MYSQL_*` values and delete the `tenants` rows to reset local state |
| `pnpm` not found | `corepack enable`, or `npm i -g pnpm@10.12.4` |
| Native deps fail on install | `pnpm approve-builds` — `sharp`, `@tailwindcss/oxide` and `unrs-resolver` need postinstall scripts |

## SEO & Icons

Every public page carries a complete set of metadata. `lib/seo.ts` is the
single source of truth — import `pageMetadata()` rather than hand-rolling
`openGraph` and `twitter` blocks.

| File | Purpose |
| ---- | ------- |
| `lib/seo.ts` | Shared metadata builder, site URL resolution, JSON-LD schemas |
| `app/layout.tsx` | Root metadata, title template, viewport, theme colour |
| `app/icon.svg` | Favicon — the CITGROUP tenancy mark in brand blue |
| `app/apple-icon.tsx` | 180×180 PNG for iOS home screen (generated at build) |
| `app/opengraph-image.tsx` | 1200×630 social share card (generated at build) |
| `app/twitter-image.tsx` | X card variant, centred for cropping |
| `app/manifest.ts` | Web app manifest — installability, theme colour, shortcuts |
| `app/robots.ts` | Robots policy — disallows the admin area |
| `app/sitemap.ts` | Sitemap — public routes and tenant pages only |

### What each public page gets

- **Title** via the root layout's `%s | CITGROUP TENANCY SYSTEM` template
- **Canonical URL** pointing at itself
- **Open Graph + Twitter card** with the generated share image
- **JSON-LD** structured data:
  - Landing page — `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`
  - Contact page — `Organization`, `ContactPage`, `FAQPage`
  - Tenant pages — `Organization`, parented by the platform
- **`noindex, nofollow`** on the auth screens and the admin area

The `FAQPage` schema is generated from the same array that renders the visible
questions, so the structured data can never drift from the page content.

### Changing the branding

Brand colour, site name and social handle live at the top of `lib/seo.ts`.
The favicon, Apple icon, OG image and Twitter image each reference
`BRAND_COLOR` — change it in one place and every asset follows.

`BRAND_COLOR` is the single brand value, but it is not used for everything.
`#0078E2` measures **4.39:1** against white, so it fails WCAG AA as small
text and as a background behind white text. The interface therefore uses two
steps of the same brand:

| Token       | Value     | Where it goes                                                                      |
| ----------- | --------- | ---------------------------------------------------------------------------------- |
| brand fill  | `#0078E2` | Decorative glows, tinted chip backgrounds (`bg-[#0078E2]/10`), borders, focus rings |
| brand ink   | `#005cb3` | Blue **text** on light surfaces, and every fill that carries white text (6.6:1)     |
| brand hover | `#004A94` | Hover / active state of the ink                                                    |

A primary button is `bg-[#005cb3] text-white hover:bg-[#004A94]`. If you
change `BRAND_COLOR`, derive a matching ink that clears 4.5:1 before using it
for text or behind white text.

> The `ImageResponse` generators use Satori's built-in font, not Geist. Fonts
> are not bundled with `next/og`, so a custom face would need shipping as a
> `.ttf` array. The default sans is close enough for a share card.

## JSON API

A small REST API for scripts and integrations. Every response uses the same
envelope, so a client branches on `ok` rather than guessing from the status
code:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "not_found", "message": "Tenant not found." } }
```

### Authentication

Two ways in, both checked per request:

| Method | Use it for |
| ------ | ---------- |
| Session cookie | The admin dashboard — no extra setup |
| `Authorization: Bearer <secret>` | Scripts, CI, integrations |

Machine keys are configured in `API_KEYS` as `name:secret` pairs:

```env
API_KEYS=integrations:sk_live_xxx,monitoring:sk_live_yyy
```

Send the secret as `Authorization: Bearer <secret>` or `x-api-key: <secret>`.
Leave `API_KEYS` blank to disable machine-key access entirely — the cookie
path still works.

### Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/health` | Liveness and database readiness. No auth. `200` healthy, `503` degraded |
| `GET` | `/api/v1/tenants` | List tenants |
| `POST` | `/api/v1/tenants` | Create a tenant and its owner |
| `GET` | `/api/v1/tenants/{subdomain}` | Read one tenant |
| `PATCH` | `/api/v1/tenants/{subdomain}` | Update the icon. The subdomain is immutable |
| `DELETE` | `/api/v1/tenants/{subdomain}` | Delete a tenant and everything under it |
| `GET` | `/api/v1/tenants/{subdomain}/users` | List a tenant members |
| `GET` | `/api/v1/stats` | Platform metrics |

```bash
# Health check — no auth needed
curl http://localhost:3030/api/health

# Create a tenant
curl -X POST http://localhost:3030/api/v1/tenants \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"acme","emoji":"🚀","email":"owner@acme.com","password":"Password123"}'
```

### Rate limits

The API applies the same limits as the browser flows — 10 tenant creations per
IP per hour. Exceeding them returns `429` with a `retryAfterSeconds` field.

## Testing

```bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # with a coverage report
```

| Suite | What it covers |
| ----- | -------------- |
| `tests/password.test.ts` | Hashing, verification, constant-time comparison |
| `tests/subdomains.test.ts` | Subdomain sanitisation, icon validation |
| `tests/seo.test.ts` | Metadata builder, URL resolution, JSON-LD schemas |
| `tests/rate-limit.test.ts` | Rate limit configuration |
| `tests/tenants.test.ts` | Tenant lifecycle against the **real** database |

The tenant suite uses the live MySQL schema rather than a mock, because the
behaviour that matters — unique-index enforcement, foreign-key cascades,
transaction rollback — lives in the database. A mock would assert the wrong
thing.

> `server-only` throws by design outside a React Server Component, so Vitest
> aliases it to a stub. The guard still does its job in the app.

## Deployment

### Docker

```bash
docker compose up --build
```

The app is served on `http://localhost:3030` with MySQL on 3306. The database
is seeded automatically and the app waits for it to pass its health check
before booting. The image is a multi-stage build: the runtime stage carries
only the standalone server, not the source or the dev dependencies.

### Without Docker

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

### Environment

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `PORT` | yes | The port the server listens on |
| `NEXT_PUBLIC_ROOT_DOMAIN` | yes | Bare host in production, host:port locally |
| `MYSQL_*` | yes | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` |
| `ADMIN_PATH` | yes | Unguessable path segment for the admin area |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | The site administrator account |
| `ADMIN_SESSION_SECRET` | yes | 32+ characters, signs the session cookie |
| `TENANT_SESSION_SECRET` | no | Separate secret for tenant sessions |
| `API_KEYS` | no | Machine keys for the JSON API |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | no | Upstash Redis, instead of the MySQL counter store |

### Health checks

`/api/health` reports the process state, the database reachability and the
counter store in use. It returns `503` when a dependency is down, so a load
balancer can pull the instance out of rotation. Both the Dockerfile and
`docker-compose.yml` use it as their health check.

### CI

`.github/workflows/ci.yml` runs the type check, the linter, the test suite
against a MySQL service container, the production build, and a Docker image
smoke test on every push and pull request.

## Deployment

1. Push the repository to GitHub and import it into Vercel
2. Provision a MySQL 8 database and set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`,
   `MYSQL_PASSWORD` and `MYSQL_DATABASE` in the project's environment variables
3. Set `NEXT_PUBLIC_ROOT_DOMAIN` to your production domain — bare host, no
   scheme, no port
4. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and a fresh `ADMIN_SESSION_SECRET`
   (32+ chars) in your host's secret manager — **never in git**
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
