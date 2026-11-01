# Implementation checklist

- [ ] Password: upgrade hashPassword / verifyPassword to scrypt (memory-hard KDF)
- [ ] DB: fix MySQL CREATE INDEX IF NOT EXISTS syntax for 8.4 compat
- [ ] Layout: cap grid cards at max-w-7xl for ultrawide; apply full-width to auth/admin pages
- [ ] Subdomain: add FAQPage / BreadcrumbList JSON-LD to subdomain page
- [ ] Tests: add route-level test for /faq content
- [ ] Verify: pnpm check clean; pnpm build passes; all auth/admin routes working
- [ ] Commit and push
