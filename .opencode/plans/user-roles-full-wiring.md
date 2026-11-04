# User Roles — Full Wiring & Missing Roles Plan

## Source documentation
- `documentation-page.md` (tenant roles: owner/admin/member, docs_sections tiering)
- `lib/db/mysql.ts` (DB enums: admin_users super_admin/admin; tenant_users owner/admin/member; docs_sections owner/admin/member)
- `lib/auth/jwt.ts` (current payload: 'user'|'admin'|'member' — mismatched)
- Existing page: `app/s/[subdomain]/documentation/page.tsx`

## Gaps found
1. JWT `JwtPayload` / `issueSession` uses `user` instead of `owner`; missing `super_admin`; admin session omits `role` entirely.
2. `app/auth/login/actions.ts` does not include `role` in tenant JWT; `getTenantSession()`/`requireTenantSession()` don't return it.
3. `app/auth/admin/login/actions.ts` does not include `role` in admin JWT; `getAdminSession()`/`requireAdminSession()` don't return it.
4. `docs_sections` exists but has no seed rows for any role tier.
5. No role-based authorization helpers (e.g., `requireTenantRole`).

## Recommended actions (implementation-ready)
- Update `lib/auth/jwt.ts`: role enum = 'owner' | 'admin' | 'member' for tenant; 'super_admin' | 'admin' for admin payloads.
- Update `app/auth/login/actions.ts`: include `role` (from `tenant_users` query) in JWT payload; update `getTenantSession()` / `requireTenantSession()` to expose `role`.
- Update `app/auth/admin/login/actions.ts`: query `role` from `admin_users`; include in JWT; expose via `getAdminSession()` / `requireAdminSession()`.
- Create seed SQL / `inject_ddl.js` addition to insert 3 `docs_sections` rows (owner/admin/member).
- Add optional `lib/auth/role-check.ts` with `requireTenantRole()` and `requireAdminRole()`.
- Verify `documentation/page.tsx` uses session role (already queries DB; can stay or switch to session role for consistency).

## Success criteria
- `pnpm check`, `pnpm test`, `pnpm build` pass clean.
- All three tenant roles and both admin roles are present in DB schema, JWT payload, session helpers, and seeded content.
