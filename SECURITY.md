# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.
Use GitHub's **Security → Report a vulnerability** advisory form for this
repository.

## What is already protected

### Admin authentication — implemented

`/admin` requires a password. The session is an `HttpOnly` cookie holding an
HS256 JWT signed with `ADMIN_SESSION_SECRET`, expiring after 8 hours.

| File | Role |
| ---- | ---- |
| `lib/auth.ts` | Data Access Layer. Imports `server-only`; the only place that reads the session secret or decides who is an admin |
| `lib/rate-limit.ts` | Brute-force protection for the login endpoint |
| `app/admin/login/actions.ts` | `loginAction` / `logoutAction` |
| `app/admin/login/page.tsx` | Sign-in screen |

**Enforcement happens in two independent places**, because a page-level check
does not cover Server Actions — they are reachable by direct `POST`:

1. `requireAdmin()` in `app/admin/page.tsx` decides which UI renders
2. `getSession()` at the top of `deleteSubdomainAction` is the check that
   actually protects the data

Verified by replaying a captured, signed-in delete request without a session
cookie: the action returned *"Your session has expired"* and the tenant was not
deleted.

Other properties:

- Passwords are compared with `timingSafeEqual` over SHA-256 digests, so there
  is no length or content timing leak
- Missing configuration **fails closed** — `/admin` denies every request rather
  than falling open, and renders no password form
- Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production
- Rotating `ADMIN_SESSION_SECRET` invalidates every existing session immediately

### Rate limiting is store-backed

`lib/rate-limit.ts` keeps counters in the configured `KvClient`, so limits hold
across every instance of a multi-instance or serverless deployment rather than
resetting per process. `incr` is atomic, so concurrent attempts cannot lose a
count. The window is encoded in the key and each key carries a TTL, which keeps
the key space bounded without needing a sweep.

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

### Production fails fast without Redis

`lib/redis.ts` throws at startup when `NODE_ENV=production` and the Upstash
credentials are missing, instead of silently serving from the local file store.
The check is skipped during `next build`, which also runs with
`NODE_ENV=production` but never touches the store — otherwise CI without
production secrets could never build.

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

### 4. The local store is still selected outside production

`lib/local-store.ts` is selected whenever the Upstash credentials are missing,
which is the intended behaviour for local development. The production guard
above prevents it from reaching production, but a staging or preview
environment running with `NODE_ENV=development` and no Redis would still use it —
its data lives in one throwaway file.

**Fix** — set the credentials in every deployed environment, or force the driver
from an environment variable rather than inferring it from missing config.

### 5. Single shared admin credential

There is one password from the environment, so there is no per-user identity,
no audit trail, and no way to revoke one person's access without rotating the
secret for everyone.

**Fix** — swap `lib/auth.ts` for a real identity provider. The DAL boundary
means only that module changes: `requireAdmin()` and `getSession()` are the
entire surface the rest of the app depends on.

### 6. Wildcard DNS and TLS

Subdomain routing depends on a wildcard DNS record (`*.yourdomain.com`) and a
wildcard certificate. Confirm both are configured, and that the platform
rejects requests for subdomains you have not registered rather than serving them.

## Hardening checklist

- [x] Add authentication and per-action authorisation to `/admin`
- [x] Move login rate limiting into the shared store
- [x] Rate-limit tenant creation
- [x] Fail fast in production when Redis credentials are missing
- [ ] Key the rate limiter on a header your platform guarantees
- [ ] Replace the shared password with real identities if you need an audit trail
- [ ] Review the proxy matcher whenever routes or Server Actions move
- [ ] Decide whether tenant data is user-supplied and sanitise it accordingly

## Input handling already in place

These are handled in `lib/subdomains.ts` and `app/actions.ts`:

- Subdomain names are restricted to `[a-z0-9-]`; anything else is rejected
  before it reaches the store
- Stored keys are re-sanitised on read as defence in depth
- `deleteSubdomainAction` validates that the submitted value is a non-empty
  string instead of interpolating `null` into the key
- The emoji field is length-limited to 10 characters
- Every Server Action re-checks authorisation internally, so a page-level check
  can never be mistaken for the real boundary

That validation is **not** a substitute for authorisation. Sanitised input from
an unauthenticated caller is still unauthenticated.