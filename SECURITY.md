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
  than falling open
- Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production
- Five failed attempts lock an IP out for 15 minutes
- Rotating `ADMIN_SESSION_SECRET` invalidates every existing session immediately

## Known limitations of this starter

This repository is a **demonstration of multi-tenant routing**. The following
remain open. Close them before exposing the app to untrusted users.

### 1. Login rate limiting is per-instance and in-memory

`lib/rate-limit.ts` keeps counters in process memory. They reset on restart and
are **not shared between instances**, so on a multi-instance or serverless
deployment the effective limit is N × 5 attempts.

The client identifier comes from `X-Forwarded-For` / `X-Real-IP`, which a caller
can spoof unless a trusted proxy overwrites them. This raises the cost of
guessing; it is not an access control.

**Fix** — move the counter to Redis through the existing `KvClient` interface,
and key it on an address your platform guarantees (`request.ip`, a Vercel
header, or a Cloudflare `CF-Connecting-IP`).

### 2. Tenant creation is unauthenticated and unthrottled

`createSubdomainAction` is intentionally public — the landing page invites
anyone to claim a subdomain. It has no rate limit or CAPTCHA, so an automated
client can exhaust the namespace.

**Fix** — rate-limit it with the same mechanism used for login, and add an
authentication step if subdomains are a claimed or paid resource.

### 3. Subdomain squatting

Subdomains are first-come, first-served with no ownership proof. Deletion is
now protected, but anyone can still register a name you wanted.

### 4. The local store must never run in production

`lib/local-store.ts` is selected whenever `KV_REST_API_URL` or
`KV_REST_API_TOKEN` is missing. It is a JSON file with no authentication, no
concurrency control and no durability guarantees — suitable for local
development only.

It also degrades **silently**: a misconfigured production deploy appears to
work, then loses all data on restart.

**Fix** — make missing credentials a hard startup error in production:

```ts
// lib/redis.ts
if (process.env.NODE_ENV === 'production' && !hasUpstashCredentials()) {
  throw new Error(
    'KV_REST_API_URL and KV_REST_API_TOKEN must be set in production.'
  );
}
```

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
- [ ] Move login rate limiting into Redis (a per-instance limit is a real weakness)
- [ ] Rate-limit tenant creation
- [ ] Fail fast in production when Redis credentials are missing
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