# Implementation checklist

- [x] Password: upgrade hashPassword / verifyPassword to scrypt (memory-hard KDF)
- [x] DB: fix MySQL CREATE INDEX IF NOT EXISTS syntax for 8.4 compat
- [x] Layout: cap grid cards at max-w-7xl for ultrawide; apply full-width to auth/admin pages
- [x] Subdomain: add FAQPage / BreadcrumbList JSON-LD to subdomain page
- [x] Tests: add route-level test for /faq content
- [x] Cross-review completed (manual — subagent unavailable; no P0 in edited code)
- [x] Verify: pnpm build passes; auth/admin routes included; no exclusions applied
- [x] Commit and push (190db8e)
- [x] Clean temp/review artifacts; no user data affected
