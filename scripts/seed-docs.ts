/**
 * scripts/seed-docs.ts
 *
 * Seeds default documentation sections into the `docs_sections` table so the
 * knowledge base (/kb) has real content out of the box and SAM's
 * `getDocsContext()` has material to draw from.
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

// ─────────────────────────────────────────────────────────────
// Owner — workspace-level documentation
// ─────────────────────────────────────────────────────────────
const OWNER_SECTIONS: DocSection[] = [
  {
    role: 'owner',
    title: 'Getting Started',
    body: `
<p>Welcome to your CITGROUP TENANCY SYSTEM workspace. As the owner, you have full control over your tenant&rsquo;s subdomain, data, and members.</p>

<h2>What you can do</h2>
<ul>
  <li>Create and configure your tenant workspace</li>
  <li>Invite members and assign roles</li>
  <li>Manage branding (emoji, subdomain)</li>
  <li>View usage analytics and billing</li>
  <li>Access the admin dashboard at your hidden <code>/$ADMIN_PATH</code> URL</li>
</ul>

<h2>First steps</h2>
<ol>
  <li>Sign in at <code>{subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3030'}/auth/login</code></li>
  <li>Customise your tenant emoji and branding from the dashboard</li>
  <li>Invite team members from the Members page</li>
  <li>Review your usage and billing from the Settings page</li>
</ol>

<div style="background:#f0f7ff;border-left:4px solid #0078E2;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Tip:</strong> Your subdomain is immutable — it&rsquo;s the routing key for your tenant. Choose it carefully.</p>
</div>
`,
    sort_order: 1,
  },
  {
    role: 'owner',
    title: 'Tenant Isolation',
    body: `
<p>Each tenant lives in its own subdomain and data scope. CITGROUP TENANCY SYSTEM enforces hard data boundaries at every layer — routing, data access, and authorization.</p>

<h2>How isolation works</h2>
<ul>
  <li><strong>Subdomain routing:</strong> The edge proxy inspects the <code>Host</code> header and resolves your tenant before the request reaches your route.</li>
  <li><strong>Data scoping:</strong> Every database query is filtered by <code>tenant_id</code>, enforced by foreign keys at the schema level.</li>
  <li><strong>Session binding:</strong> Sessions carry the tenant id and are scoped to the issuing host. A token for one tenant cannot address another.</li>
</ul>

<h2>What this means for you</h2>
<ul>
  <li>No other customer can read or modify your records, files, or settings.</li>
  <li>Your data never shares a row with another tenant&rsquo;s.</li>
  <li>Sessions cannot be promoted across tenants by changing the address bar.</li>
</ul>

<div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Note:</strong> Isolation is derived from the request, not from a value the client can send. There is no code path that returns rows outside the active tenant scope.</p>
</div>
`,
    sort_order: 2,
  },
  {
    role: 'owner',
    title: 'Billing & Usage',
    body: `
<p>Review usage snapshots, invoices, and connect a billing profile from the Billing tab. Only the workspace owner can manage billing.</p>

<h2>Usage metrics</h2>
<ul>
  <li><code>tenant_users</code> — number of active members</li>
  <li><code>tenant_sessions</code> — active and expired sessions</li>
  <li><code>contact_enquiries</code> — support requests submitted</li>
</ul>

<h2>Billing</h2>
<p>Billing is managed per tenant. As the owner, you&rsquo;re responsible for the subscription associated with your workspace. Invoices are generated monthly and can be downloaded from the Billing tab.</p>

<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Important:</strong> If your subscription lapses, your tenant remains accessible but new member invitations and data writes may be restricted until payment is resolved.</p>
</div>
`,
    sort_order: 3,
  },
];

// ─────────────────────────────────────────────────────────────
// Admin — content moderation and users
// ─────────────────────────────────────────────────────────────
const ADMIN_SECTIONS: DocSection[] = [
  {
    role: 'admin',
    title: 'Security & Sessions',
    body: `
<p>Admins can moderate submitted content, resolve support requests, and manage tenant users. Sessions are time-limited and cookie-bound.</p>

<h2>Session security</h2>
<ul>
  <li>Sessions are signed HS256 tokens in an <code>httpOnly</code>, <code>SameSite=Lax</code> cookie.</li>
  <li>Expiry is short — 24 hours for tenant sessions.</li>
  <li>The server records each session so it can be revoked. Deleting a session row logs that user out on their next request.</li>
  <li>Sessions are bound to the host that issued them.</li>
</ul>

<h2>Brute-force protection</h2>
<ul>
  <li>Failed logins increment a counter in the durable store with a rolling time window.</li>
  <li>Because the counter lives in the database rather than process memory, the limit holds across every instance and survives restarts.</li>
  <li>The sign-in form reports how many minutes remain rather than failing silently.</li>
</ul>

<div style="background:#f8d7da;border-left:4px solid #dc3545;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Warning:</strong> Five failed sign-in attempts within fifteen minutes will lock the account temporarily. Wait for the lockout window to expire or contact an administrator.</p>
</div>
`,
    sort_order: 1,
  },
  {
    role: 'admin',
    title: 'API Reference',
    body: `
<p>The JSON API uses a single <code>{ ok: true, data }</code> or <code>{ ok: false, error }</code> envelope and accepts either the admin session cookie or a machine key. Anything that creates data is rate-limited, and the health endpoint is the only unauthenticated route.</p>

<h2>Authentication</h2>
<ul>
  <li><strong>Session cookie:</strong> Set by the admin login action. Sent automatically by the browser on subsequent requests.</li>
  <li><strong>Machine key:</strong> Present the secret in the <code>Authorization: Bearer</code> header or <code>x-api-key</code> header. Machine keys are configured via the <code>API_KEYS</code> environment variable as <code>name:secret</code> pairs.</li>
</ul>

<h2>Endpoints</h2>
<table>
  <thead>
    <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>GET</td><td>/api/v1/tenants</td><td>List all tenants (auth required)</td></tr>
    <tr><td>POST</td><td>/api/v1/tenants</td><td>Create a tenant and its owner (auth + rate limited)</td></tr>
    <tr><td>GET</td><td>/api/v1/tenants/{subdomain}</td><td>Read one tenant (auth required)</td></tr>
    <tr><td>PATCH</td><td>/api/v1/tenants/{subdomain}</td><td>Update a tenant&rsquo;s branding/icon (auth required)</td></tr>
    <tr><td>DELETE</td><td>/api/v1/tenants/{subdomain}</td><td>Delete a tenant and all its data (auth required)</td></tr>
    <tr><td>GET</td><td>/api/health</td><td>Health check (unauthenticated)</td></tr>
  </tbody>
</table>

<div style="background:#e7f1ff;border-left:4px solid #005cb3;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Rate limits:</strong> Tenant creation is limited to 10 per IP per hour. Anything that creates data is rate-limited per IP.</p>
</div>
`,
    sort_order: 2,
  },
  {
    role: 'admin',
    title: 'Content Moderation',
    body: `
<p>Admins can moderate submitted content, resolve support requests, and manage tenant users.</p>

<h2>Moderation queue</h2>
<ul>
  <li>Contact enquiries arrive via the contact form on your tenant&rsquo;s public page.</li>
  <li>Each enquiry is tagged with a category (support, sales, billing, partnership, feedback, other).</li>
  <li>Enquiries are retained for 12 months, then deleted.</li>
</ul>

<h2>Managing users</h2>
<ul>
  <li>Invite new members to a tenant with a temporary password.</li>
  <li>Change a member&rsquo;s role (owner, admin, member).</li>
  <li>Suspend or restore a member.</li>
  <li>Remove a member (a tenant must keep at least one owner).</li>
</ul>

<div style="background:#f0f7ff;border-left:4px solid #0078E2;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Note:</strong> The last owner cannot be demoted, suspended, or removed — a tenant must always keep at least one owner.</p>
</div>
`,
    sort_order: 3,
  },
];

// ─────────────────────────────────────────────────────────────
// Member — standard access
// ─────────────────────────────────────────────────────────────
const MEMBER_SECTIONS: DocSection[] = [
  {
    role: 'member',
    title: 'Getting Started',
    body: `
<p>Welcome to your workspace. Use the navigation to explore your tenant&rsquo;s content, submit support requests, and manage your profile.</p>

<h2>Your dashboard</h2>
<ul>
  <li>View your tenant&rsquo;s emoji, subdomain, and creation date.</li>
  <li>See how many members are in your workspace.</li>
  <li>Sign in to your tenant dashboard from your subdomain page.</li>
</ul>

<h2>What you can do</h2>
<ul>
  <li>View tenant information and member list.</li>
  <li>Update your profile (name, email).</li>
  <li>Submit support requests via the contact form.</li>
  <li>Sign in and out of your workspace.</li>
</ul>

<div style="background:#f0f7ff;border-left:4px solid #0078E2;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Tip:</strong> Your tenant is reachable at <code>{subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3030'}</code>. Bookmark this URL for quick access.</p>
</div>
`,
    sort_order: 1,
  },
  {
    role: 'member',
    title: 'Profile Settings',
    body: `
<p>Manage your personal information within your tenant workspace.</p>

<h2>Editable fields</h2>
<ul>
  <li><strong>Name:</strong> Your display name within the workspace.</li>
  <li><strong>Email:</strong> Your work email address used for sign-in.</li>
  <li><strong>Password:</strong> Can be changed at any time (minimum 8 characters).</li>
</ul>

<h2>Changing your password</h2>
<ol>
  <li>Go to your profile settings.</li>
  <li>Enter your current password and the new password (8+ characters).</li>
  <li>Confirm the new password and save.</li>
</ol>

<div style="background:#d4edda;border-left:4px solid #28a745;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Note:</strong> Passwords are stored as salted scrypt hashes. No plaintext passwords are ever stored or compared.</p>
</div>
`,
    sort_order: 2,
  },
  {
    role: 'member',
    title: 'Support Requests',
    body: `
<p>Submit support requests via the contact form on your tenant&rsquo;s public page. Enquiries are routed to the support team and answered within one business day.</p>

<h2>What to include</h2>
<ul>
  <li>Your tenant subdomain</li>
  <li>Your account email</li>
  <li>The exact error text (if any)</li>
  <li>The time the issue occurred</li>
  <li>A screenshot, if applicable</li>
</ul>

<h2>Categories</h2>
<ul>
  <li><strong>Technical support:</strong> Something broken in a tenant — include the subdomain, error message, and time.</li>
  <li><strong>Sales enquiries:</strong> Pricing, volume discounts, evaluation environments.</li>
  <li><strong>Billing &amp; invoices:</strong> Questions about invoices or payments.</li>
  <li><strong>Partnership:</strong> Resellers, integrators, and technology partners.</li>
  <li><strong>Product feedback:</strong> Suggestions and feature requests.</li>
  <li><strong>Something else:</strong> Anything else.</li>
</ul>

<div style="background:#e7f1ff;border-left:4px solid #005cb3;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Response time:</strong> Technical support is answered within one business day. Security issues are triaged within 24 hours.</p>
</div>
`,
    sort_order: 3,
  },
];

const SECTIONS = [...OWNER_SECTIONS, ...ADMIN_SECTIONS, ...MEMBER_SECTIONS];

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
