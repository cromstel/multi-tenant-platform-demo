/**
 * scripts/seed-docs.ts
 *
 * Seeds default documentation sections into the `docs_sections` table so the
 * table is not empty out of the box and SAM's `getDocsContext()` has content
 * to draw from.
 *
 * Idempotent: for each section it checks whether a row with the same
 * `(role, title)` already exists and updates it, otherwise inserts a new row.
 * Running the script multiple times never duplicates rows.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-docs.ts
 *   # or, on Node with type stripping enabled:
 *   node --experimental-strip-types scripts/seed-docs.ts
 */

import { getMySQLPool } from '@/lib/db/mysql';

type Role = 'owner' | 'admin' | 'member';

interface DocSection {
  role: Role;
  title: string;
  body: string;
  sort_order: number;
}

// Default documentation sections tiered by role.
// Titles: "Getting Started", "Tenant Isolation", "Security", "Billing",
// "API Reference" — distributed across owner, admin and member.
const SECTIONS: DocSection[] = [
  // Owner — workspace-level documentation
  {
    role: 'owner',
    title: 'Getting Started',
    body:
      'Set up your workspace: name, emoji, branding, and default settings. The owner role is created first for a tenant and has full control.',
    sort_order: 1,
  },
  {
    role: 'owner',
    title: 'Tenant Isolation',
    body:
      'Each tenant lives in its own subdomain and data scope. Tenants cannot read or modify other tenants\u2019 records, files, or settings.',
    sort_order: 2,
  },
  {
    role: 'owner',
    title: 'Billing',
    body:
      'Review usage snapshots, invoices, and connect a billing profile from the Billing tab. Only the workspace owner can manage billing.',
    sort_order: 3,
  },
  // Admin — content moderation and users
  {
    role: 'admin',
    title: 'Security',
    body:
      'Admins can moderate submitted content, resolve support requests, and manage tenant users. Sessions are time-limited and cookie-bound.',
    sort_order: 1,
  },
  {
    role: 'admin',
    title: 'API Reference',
    body:
      'The JSON API uses a single { ok, data } envelope. Authenticate with the admin session cookie or a machine key from API_KEYS. Rate limits apply to write endpoints.',
    sort_order: 2,
  },
  // Member — standard access
  {
    role: 'member',
    title: 'Getting Started',
    body:
      'Welcome to your workspace. Use the navigation to explore your tenant\u2019s content, submit support requests, and manage your profile.',
    sort_order: 1,
  },
];

async function main(): Promise<void> {
  const pool = await getMySQLPool();
  let inserted = 0;
  let updated = 0;

  for (const section of SECTIONS) {
    const [existing] = await pool.execute(
      'SELECT id FROM docs_sections WHERE role = ? AND title = ? LIMIT 1',
      [section.role, section.title]
    );
    const row = (existing as Array<{ id: number }>)[0];

    if (row) {
      await pool.execute(
        `UPDATE docs_sections
         SET body = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [section.body, section.sort_order, row.id]
      );
      updated += 1;
    } else {
      await pool.execute(
        `INSERT INTO docs_sections (role, title, body, sort_order)
         VALUES (?, ?, ?, ?)`,
        [section.role, section.title, section.body, section.sort_order]
      );
      inserted += 1;
    }
  }

  console.log(
    `Seeded docs_sections: ${inserted} inserted, ${updated} updated, ${SECTIONS.length} total.`
  );
}

main().catch((error: unknown) => {
  console.error(
    'Failed to seed docs_sections:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
