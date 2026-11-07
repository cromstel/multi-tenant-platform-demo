# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.
Use GitHub's **Security → Report a vulnerability** advisory form for this
repository.

## What is already protected

### Admin authentication — implemented

`/auth/admin` requires an email and password. The session is an `HttpOnly`
cookie holding an HS256 JWT signed with `ADMIN_SESSION_SECRET`, expiring after
8 hours.

| File | Role |
| ---- | ---- |
| `app/auth/admin/login/actions.ts` | Data Access Layer. The only place that reads the session secret or decides who is an admin |
| `lib/rate-limit.ts` | Brute-force protection for the login endpoint |
| `app/auth/admin/login/page.tsx` | Sign-in screen |
| `app/actions.ts` | `deleteSubdomainAction` / `bulkDeleteSubdomainsAction` — the actions that actually mutate data |

**Enforcement happens in two independent places**, because a page-level check
does not cover Server Actions — they are reachable by direct `POST`:

1. `requireAdminSession()` in `app/auth/admin/page.tsx` decides which UI renders
2. `getAdminSession()` at the top of `deleteSubdomainAction` and
   `bulkDeleteSubdomainsAction` is the check that actually protects the data

**Both must use the same helper.** They once used different modules
(`lib/auth.ts` and `app/auth/admin/login/actions.ts`), which meant they read
different cookies — every delete failed with *"Your session has expired"* even
for a signed-in administrator. The legacy `lib/auth.ts` has been removed so the
duplicate cannot come back.

Verified by replaying a captured, signed-in delete request without a session
cookie: the action returned *"Your session has expired"* and the tenant was not
deleted.

Other properties:

- Passwords are compared with `timingSafeEqual` over SHA-256 digests, so there
  is no length or content timing leak
- Missing configuration **fails closed** — `/auth/admin` denies every request
  rather than falling open, and renders no password form
- Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production
- Rotating `ADMIN_SESSION_SECRET` invalidates every existing session immediately
- The administrator account is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on
  first sign-in. The seed only runs when the submitted credentials match the
  environment exactly, so a wrong guess cannot create a backdoor account.

### The contact form is hardened

`app/contact/actions.ts` is a public, unauthenticated endpoint, so it is
defended in layers:

- **Rate limited** to 5 messages per IP per hour, counted in the shared
  store. Every attempt is counted, not just the successful ones — otherwise
  a bot could fill the table without consuming budget.
- **Honeypot** — a hidden `website` field. A real browser leaves it empty; a
  bot that fills it in is accepted silently and dropped, so the sender is not
  told they were caught.
- **Validated server-side** — every field is trimmed, length-capped, and
  checked. The client-side validation is a convenience, not the boundary.
- **Parameterised queries** throughout. No value is interpolated into SQL.
- **Errors are not leaked** — a failed insert returns a generic message. The
  underlying error is never rendered to the sender.

Enquiries are stored in `contact_enquiries` and contain whatever the sender
typed, so treat that table as untrusted input. It is not currently surfaced
anywhere public.

### The JSON API is authenticated per request

Every route under `/api/v1` calls `requireAdminOrApiKey()`, which accepts
either the admin session cookie or a machine key from `API_KEYS`. Keys are
compared with a constant-time hash, so a caller cannot discover a valid key
by measuring response times.

`/api/health` is the only unauthenticated route. It reports the process
state, the database reachability and which counter store is in use — nothing
that identifies a tenant or a user.

```bash
# Unauthenticated — rejected
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/api/v1/tenants
# expect: 401

# With a machine key — allowed
curl -s -H "Authorization: Bearer $API_KEY" http://localhost:3030/api/v1/tenants
```

### Member management preserves the last owner

`changeMemberRoleAction`, `setMemberActiveAction` and `removeMemberAction`
all refuse to demote, suspend or delete the only owner of a tenant. A tenant
with no owner cannot be administered, and there would be no way back.

### Password hashing is salted but not memory-hard

`lib/password.ts` stores `salt:sha256(password + salt)` and compares in
constant time. That is salted and safe against rainbow tables and timing
attacks, but SHA-256 is fast to compute, so an attacker with a copy of the
database can brute-force offline at billions of hashes per second.

**Fix** — move `hashPassword()` and `verifyPassword()` to scrypt or
argon2. Both are in one module, so the change is contained. The stored format
is versioned by the salt length, so old hashes can be re-hashed on the next
successful sign-in.

### Rate limiting is store-backed

`lib/rate-limit.ts` keeps counters in the configured `KvClient` — the MySQL
`kv_store` table when `MYSQL_HOST` and `MYSQL_DATABASE` are set, or Upstash
Redis when its credentials are present. Either way the limits hold across
every instance of a multi-instance or serverless deployment rather than
resetting per process. `incr` is atomic, so concurrent attempts cannot lose
a count. The window is encoded in the key and each key carries a TTL, which
keeps the key space bounded without needing a sweep.

| Limit           | Allowance       | Window |
| --------------- | --------------- | ------ |
| Admin login     | 5 failures / IP | 15 min |
| Tenant creation | 10 / IP         | 1 hour |

Both counters were confirmed to survive a full server restart, and a successful
login clears its counter.

The client identifier comes from `X-Forwarded-For` / `X-Real-IP` and is hashed
with SHA-256 before use, so a spoofed header can be neither arbitrarily long nor
able to forge a key in another namespace. It remains only as trustworthy as the
proxy in front of you.

### The admin URL is hidden

The administrator area is not linked from any public page, is marked
`noindex`, and is excluded from `robots.txt` and `sitemap.xml`.

Its public entry point is `ADMIN_PATH` — an unguessable segment from the
environment:

```env
ADMIN_PATH=ops-7f3a9c2b4e
```

While it is set, `proxy.ts` rewrites `/{ADMIN_PATH}` onto the real routes and
answers the real routes with a **404, not a redirect** — a redirect would hand
the internal path straight back:

| Request                   | Response |
| ------------------------- | -------- |
| `/{ADMIN_PATH}`           | Admin sign in |
| `/{ADMIN_PATH}/dashboard` | Admin dashboard |
| `/auth/admin`             | 404 |
| `/auth/admin/login`       | 404 |
| `/admin`                  | 404 |
| `/admin/login`            | 404 |

This is obscurity, not access control. The session check and the in-action
authorisation are what actually protect the data — a leaked `ADMIN_PATH` only
removes the first obstacle.

### Tenant isolation is enforced by the schema

Tenant data lives in MySQL with foreign keys, not in a flat key/value bag:

- `tenants.subdomain` is `UNIQUE`, so two simultaneous signups cannot claim the
  same name — the database rejects the loser
- `tenant_users.tenant_id` and `tenant_sessions.tenant_id` are foreign keys
  with `ON DELETE CASCADE`, so a tenant's members cannot outlive it
- Every query filters on the authenticated tenant id; there is no code path
  that returns rows outside the active tenant scope

### Production fails fast without a durable store

`lib/redis.ts` throws at startup when `NODE_ENV=production` and neither the
Upstash credentials nor the MySQL configuration are present, instead of
silently serving from the local file store. The check is skipped during
`next build`, which also runs with `NODE_ENV=production` but never touches
the store — otherwise CI without production secrets could never build.

### Dependency posture

`pnpm audit` reports **0 critical and 1 high**. The remaining advisory is
`braces`, reached through `eslint-config-next → fast-glob → micromatch`; its
`patched_versions` is `<0.0.0`, meaning no fix has been published, so it cannot
be cleared from here. It is a lint-time-only devDependency and does not ship.

Transitive advisories in `tar`, `postcss`, `nanoid` and `source-map-js` — all
pulled in by `@tailwindcss/postcss` — are pinned above their fixed versions with
`pnpm.overrides` in `package.json`. Those run at build time and likewise never
reach the deployed server.

Re-run `pnpm audit` after any dependency change.

## Known limitations of this starter

This repository is a **demonstration of multi-tenant routing**. The following
remain open. Close them before exposing the app to untrusted users.

### 1. The rate limiter trusts proxy headers

Counters are keyed on a hash of `X-Forwarded-For` / `X-Real-IP`. If the app is
reachable directly from the internet, a caller can rotate that header and get a
fresh budget per request, which reduces both limits to nothing.

**Fix** — key on an address your platform guarantees: `request.ip` on a Node
server, or the platform's own header (Vercel, Cloudflare `CF-Connecting-IP`).

### 2. Tenant creation is unauthenticated

`createSubdomainAction` is intentionally public — the landing page invites
anyone to claim a subdomain — and is now rate limited to 10 per hour per IP. It
still has no CAPTCHA or ownership check, so a determined attacker with many
addresses can still exhaust the namespace.

**Fix** — add an authentication or claim-confirmation step if subdomains are a
claimed or paid resource.

### 3. Subdomain squatting

Subdomains are first-come, first-served with no ownership proof. Deletion is
protected and creation is throttled, but anyone can still register a name you
wanted.

### 4. Password hashing is salted SHA-256, not a KDF

`lib/auth.ts` and the auth actions hash passwords with a random salt and
SHA-256, compared in constant time. That is a salted hash, not a
memory-hard key derivation function.

**Fix** — use `scrypt`, `argon2` or `bcrypt` for stored passwords. The
comparison site is a single helper, so the swap is contained.

### 5. Single shared admin credential

There is one administrator from the environment, so there is no per-user
identity, no audit trail, and no way to revoke one person's access without
rotating the secret for everyone. The `admin_users` table has a `role` column
and is ready for multiple accounts, but nothing populates it yet.

**Fix** — swap `app/auth/admin/login/actions.ts` for a real identity provider.
The DAL boundary means only that module changes: `requireAdminSession()` and
`getAdminSession()` are the entire surface the rest of the app depends on.

### 6. Wildcard DNS and TLS

Subdomain routing depends on a wildcard DNS record (`*.yourdomain.com`) and a
wildcard certificate. Confirm both are configured, and that the platform
rejects requests for subdomains you have not registered rather than serving them.

## Hardening checklist

- [x] Add authentication and per-action authorisation to the admin area
- [x] Move login rate limiting into the shared store
- [x] Rate-limit tenant creation
- [x] Fail fast in production when store credentials are missing
- [x] Enforce tenant isolation with foreign keys rather than convention
- [x] Remove the duplicate auth module that caused a cookie mismatch
- [x] Hide the admin URL behind an unguessable path and unlink it everywhere
- [x] Add a JSON API with per-request authentication
- [x] Add a health endpoint for load balancers
- [x] Containerise the app and add CI
- [ ] Key the rate limiter on a header your platform guarantees
- [ ] Replace SHA-256 password hashing with a memory-hard KDF
- [ ] Replace the shared password with real identities if you need an audit trail
- [ ] Review the proxy matcher whenever routes or Server Actions move
- [ ] Decide whether tenant data is user-supplied and sanitise it accordingly
- [ ] Add an email transport — member invites currently return a temporary
      password to the admin instead of emailing it
- [ ] Replace SHA-256 password hashing with a memory-hard KDF
- [ ] Replace the shared password with real identities if you need an audit trail
- [ ] Review the proxy matcher whenever routes or Server Actions move
- [ ] Decide whether tenant data is user-supplied and sanitise it accordingly

## Input handling already in place

These are handled in `lib/subdomains.ts` and `app/actions.ts`:

- Subdomain names are restricted to `[a-z0-9-]`; anything else is rejected
  before it reaches the store
- A subdomain that changes under sanitisation is rejected rather than silently
  accepted, so the user sees exactly what they typed
- Stored keys are re-sanitised on read as defence in depth
- `deleteSubdomainAction` validates that the submitted value is a non-empty
  string instead of interpolating `null` into the key
- Bulk delete runs in a transaction and rolls back on any error
- The emoji field is length-limited to 10 characters
- Every Server Action re-checks authorisation internally, so a page-level check
  can never be mistaken for the real boundary

That validation is **not** a substitute for authorisation. Sanitised input from
an unauthenticated caller is still unauthenticated.
