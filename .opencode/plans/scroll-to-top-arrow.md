# Scroll-to-top arrow — plan

## Goal
Add a scroll-to-top arrow that appears on all public pages (all non-auth routes), excluding `/auth/*` and `/admin/*`, without changing the AI chatbot (`SAMWidget`) position.

## Constraints
- Chatbot is fixed `bottom-6 right-6`; arrow must not overlap or shift it.
- Auth pages use `app/auth/layout.tsx` (no `SiteHeader`); admin pages are also excluded.
- Must work on subdomain routes (`/s/[subdomain]/...`).

## Design (approved recommendations)
- Placement: `fixed bottom-6 left-6 z-50` (opposite corner from chatbot).
- Style: circular `w-12 h-12 rounded-full bg-[#005cb3] text-white shadow-xl hover:bg-[#004A94]`, `ArrowUp` lucide icon.
- Visibility: fade in after 300px scroll; smooth scroll to `window.scrollTo({ top: 0 })`.
- Accessibility: `aria-label="Scroll to top"`.

## Implementation
1. Create `components/scroll-to-top.tsx` (`'use client'`): scroll listener + button.
2. Mount in `app/layout.tsx` (next to `SAMWidget`), with pathname exclusion for `/auth/*` and `/admin/*` (matching `FloatingBar`).
3. No changes to `components/sam/widget.tsx` or its CSS.

## Validation
- `pnpm check` passes.
- Arrow does not appear on `/auth/login`, `/auth/register`, `/auth/admin/login`, `/admin`.
- Arrow appears on `/`, `/about`, `/contact`, `/faq`, `/services`, and subdomain pages.
- Chatbot position unchanged (`bottom-6 right-6`).

## Open / amendable
- If bottom-left conflicts with `FloatingBar` (`fixed right-4 top-1/2`), move arrow to `bottom-6 right-20` (left of chatbot) or `bottom-24 left-6`.
