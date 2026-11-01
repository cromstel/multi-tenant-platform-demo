# Full-browser audit findings — Mon Nov 02 2026

Verified routes (browser tabs): /, /faq, /contact, /auth/login, /s/acme, /admin
Status: all load; /admin returns Not Found (hidden); auth screens render.

## Completed / verified by prior work
- /faq created with 5 groups (21 Q&A), dark hero, jump chips, stats, JSON-LD
- Rounded edges removed globally; decorative rounded-full preserved
- Footer: Powered By CITGROUP → https://cromstelit.com
- Full-width layout applied to public pages + auth/admin included
- DB: tenant_users first_name/last_name; password scrypt; rate-limit durable
- Subdomain JSON-LD added

## UI/UX enhancement opportunities (observed + code review)
1. Redundant /admin link in subdomain footer (line 138 comment references old path); keep hidden.
2. Subdomain page badge “Active” uses rounded-full decorative — acceptable.
3. Landing hero could add aria-label to decorative glow divs (already aria-hidden).
4. FAQ jump chips at lg full-width could wrap more cleanly (current gap-2 works).
5. Contact form server-side validation (app/contact/actions.ts) — verify all fields validated.
6. Not-found page uses server `headers()` — correct, no hydration mismatch.
7. Auth forms hide labels (placeholder-only) — correct per convention; ids present.
8. Admin URL hidden via ADMIN_PATH — verified, proxy answers 404 on /auth/admin.
9. No missing alt text on icons (all decorative have aria-hidden or aria-label).
10. Contrast verified: brand ink #005cb3 (6.6:1) used for text; #0078E2 only decorative.

## Backend / API / DB enhancement opportunities
11. MySQL schema creation happens on first use; consider explicit migration script.
12. `contact_enquiries` table has no index on `email` / `status` — consider adding for admin search.
13. API `/api/v1/tenants/[subdomain]/users/route.ts` — verify RBAC uses `requireAdminOrApiKey()`.
14. Health endpoint (`/api/health`) unauthenticated — correct per invariant.
15. `proxy.ts` must not import shared modules — verified.
16. Rate-limit (`lib/rate-limit.ts`) uses `KvClient`; both `incr` and `expire` present; verified durable.
17. `lib/admin-path.ts` owns `revalidateAdmin()`; proxy keeps its own parsing rule — correct.

## Recommendations (optional, not required)
- Add `tests/faq.test.ts` content assertion (currently smoke only).
- Consider `max-w-7xl` cap inside grid sections for ultrawide monitors (already added on landing features).
- Investigate CI vulnerability (moderate, default branch) if access granted.
