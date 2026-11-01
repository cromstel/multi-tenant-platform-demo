# Protected Documentation Page — Implementation Plan

## Goal
Create a role-tiered, session-protected "Documentation" page at the tenant-subdomain path (`/app/s/[subdomain]/documentation/page.tsx`). Only logged-in tenant users can access it; content is filtered by `role` (`owner` / `admin` / `member`) from a new `docs_sections` table.

## Design Decisions (resolved with user)
- **Route**: `app/s/[subdomain]/documentation/page.tsx` (tenant subdomain, via existing proxy/subdomain routing).
- **Auth**: `requireTenantSession()` from `app/auth/login/actions.ts`; redirects unauthenticated to `/auth/login`. Page also reads session to get `userId`/`email`/`tenantId`, then queries user role from `tenant_users`.
- **DB / dynamic**: New `docs_sections` table (global docs, no subdomain link), with `role` ENUM (`owner`,`admin`,`member`), `title`, `body`, `sort_order`. Added to `lib/db/mysql.ts` `initializeMySQL()`.
- **Content tiering**: Page queries sections matching the session user's role, renders in `sort_order`. Owner sees full; admin sees management sections; member sees basic.
- **Layout**: Uses existing site chrome (`components/site-header.tsx`, `site-footer.tsx`) and card-style container consistent with auth screens; no hidden admin-path links (invariant 6).

## Implementation Checklist
- [ ] Add `docs_sections` table DDL to `lib/db/mysql.ts` (`initializeMySQL`) — `id` PK, `role` ENUM, `title` VARCHAR, `body` TEXT, `sort_order` INT DEFAULT 0.
- [ ] Create `app/s/[subdomain]/documentation/page.tsx` — Server Component.
  - Import `requireTenantSession`, `getMySQLPool`.
  - Call `requireTenantSession()` first (gate / redirect).
  - Query `tenant_users` for `role` by `id = session.userId` and validate `tenant_id` matches session.
  - Query `SELECT * FROM docs_sections WHERE role = ? ORDER BY sort_order ASC`.
  - Render sections in card layout; include role-label for accessibility.
- [ ] Create seed/insert helper (optional) to populate `docs_sections` with 3 tiered sections (owner/admin/member) for validation.
- [ ] Ensure `getMySQLPool` is awaited correctly (no deadlock with `initializeMySQL` — see invariant in AGENTS.md).
- [ ] Add `robots: { index: false }` to page metadata (protected content should not be indexed).
- [ ] Verify `pnpm check`, `pnpm test`, `pnpm build` pass clean.
- [ ] Browser-check subdomain access: sign in at `/auth/login`, navigate to `*.localhost:3030/{subdomain}/documentation`, confirm content by role.

## Data Flow
1. Browser hits `/*.localhost:3030/acme/documentation` → proxy → `app/s/[subdomain]/documentation/page.tsx`.
2. Server Component calls `requireTenantSession()` → reads `tenant_session` cookie; if missing, redirect `/auth/login`.
3. Query `tenant_users` for role; query `docs_sections` for `role`; render.

## Validation / Rollback
- Build must pass (`pnpm build`) with new route and new DDL.
- Access without cookie must 307 → `/auth/login` (verify with `curl -L --max-redirs 0`).
- Access with `member` cookie must not show `owner`-only sections.
- Rollback: drop `docs_sections` and delete new page file; existing `tenants`/`tenant_users` unchanged.

## Open / Out of Scope
- No new client-side interactivity required (Server Component sufficient); no `'use client'` unless needed for a detail toggle.
- No `admin_users` / site-admin protection needed — this is tenant-user only per user's choice.
- Content is static DB rows, not a WYSIWYG editor or file upload.
