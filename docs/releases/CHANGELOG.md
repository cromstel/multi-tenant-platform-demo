# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Password reset/recovery flow for the admin area (81d7ae7)
- Component and Server Action tests for SAM, plus status and architecture docs (0e410f4)
- API/auth/SAM tests and SECURITY_AUDIT.md (41299e1)
- Expanded /faq with grouped answers, breadcrumb, jump links and CTA (dbb4744)

### Changed
- Restored the floating bar globally via root layout (1bbacac)
- Reset page: added CITGROUP logo, sr-only hidden labels, Link fix (e4bd6d5)
- Auth form labels hidden visually with sr-only; placeholders kept (5ffe44a)
- Removed auth card max-height/overflow to prevent inner scroll on laptop (376cf33)
- Narrowed auth form cards to max-w-md (d095813, 49417ac)
- Removed FloatingBar from root layout so it is guaranteed absent from auth screens (bbc6f6d)
- Moved back-to-system link inside the auth card (75e6018)
- Floating bar now hides by checking the pathname in root layout (d80545b)
- Auth login: inline forgot-password with password label; responsive card at md/lg; brand responsive (a9232cc)
- Auth login: reduced field height to h-10; inline forgot-password with remember-me (b321403)
- Auth responsive fixes for forgot-password/remember-me on login/admin; stricter floating-bar auth hide; register login-link (cd06999)
- Disabled Next.js Dev Tools (devIndicators: false) (7ca5808)
- Full-width page layout on public pages with global chrome (0d912cc)
- /faq aligned to single max-w-3xl layout (c3105e8)
- /faq dark hero banner added; breadcrumb list dropped (dcf2d6a)
- Footer replaced status/domain with 'Powered By CITGROUP' link; removed remaining rounded edges (16e86b8)
- /services and its 6 sub-pages: hero heading h2 to h1, card titles h3 to h2 (these 7 pages had no h1); CTA drop-shadows and the dead rounded-6 class removed
- Registered `@tailwindcss/typography` so the prose/prose-sm/prose-slate classes on /kb article bodies are live instead of no-ops
- Removed `shadow-xs` from the Button primitive variants, applying the no-drop-shadow rule to admin, contact, /kb and SAM CTAs
- Normalised `rounded-none` on the remaining about and /faq CTA class lists

### Fixed
- Pre-existing type error in tests/sam/escalation.test.ts (e71307d)
- Hydration mismatch from Turbopack geist variable on body className (e1aef00)
- no-html-link errors: replaced anchor with Link on admin login (4e64db5)
- DB/auth findings: docs_sections index + updated_at, removed mysql_fixed, audit notes (cfb4dcf)
- All findings: scrypt, DB index, auth/admin full-width, tests, subdomain schema, inject_ddl + docs fixes, minimatch override (fff0730)
- All findings: scrypt, DB index, auth/admin full-width, tests, subdomain schema (190db8e)

### Security
- Fixed auth middleware blanket denial (SEC-001/002/003) (8cdb219)
- Zod validation, unified delete/bulk-delete/safeEqual/index, SAM LLM hardening (SEC-004 + DEV-001 to DEV-005) (f34b05b)

### Removed
- Vercel Speed Insights (`<SpeedInsights />`) from the root layout — its script origin (`va.vercel-scripts.com`) was blocked by the strict CSP's default-deny `script-src`
- "Back to System" link from the admin dashboard header, matching the login pages
- Unused `@vercel/analytics` dependency (declared, never imported) and the stray tracked `review-diff.patch`
