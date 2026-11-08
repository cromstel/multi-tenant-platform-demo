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

// ════════════════════════════════════════════════════════════════════════════════
// OWNER — workspace-level documentation
// ════════════════════════════════════════════════════════════════════════════════
const OWNER_SECTIONS: DocSection[] = [
  {
    role: 'owner',
    title: 'Getting Started',
    body: `
<p>Welcome to your CITGROUP TENANCY SYSTEM workspace. As the owner, you have full control over your tenant's subdomain, data, members, and billing. You are the first user created when the tenant is provisioned, and you hold the <code>owner</code> role — the highest privilege level within your tenant.</p>

<h2>What is a tenant?</h2>
<p>A tenant is your isolated workspace on the CITGROUP TENANCY SYSTEM platform. It gets:</p>
<ul>
  <li><strong>A dedicated subdomain</strong> — e.g., <code>acme.localhost:3030</code> in development or <code>acme.example.com</code> in production.</li>
  <li><strong>Isolated data storage</strong> — every row in the database is tagged with your tenant ID, so your data can never be mixed with another customer's.</li>
  <li><strong>Independent members</strong> — you can invite colleagues and assign them roles (owner, admin, member) with different permission levels.</li>
  <li><strong>Branded identity</strong> — choose a custom emoji that appears on your tenant's public page and dashboard.</li>
</ul>

<h2>First steps after sign in</h2>
<ol>
  <li><strong>Sign in</strong> at <code>{subdomain}.{rootDomain}/auth/login</code> using the email and password you created during registration.</li>
  <li><strong>Customise your tenant</strong> — go to Settings &gt; Branding to pick an emoji that represents your workspace.</li>
  <li><strong>Invite your team</strong> — from the Members page, invite colleagues by email and assign them roles.</li>
  <li><strong>Review your usage</strong> — check the Dashboard for member count, session count, and recent activity.</li>
  <li><strong>Bookmark your tenant page</strong> — your public page is at <code>{subdomain}.{rootDomain}</code>.</li>
</ol>

<div style="background:#f0f7ff;border-left:4px solid #0078E2;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Important:</strong> Your subdomain is immutable — it&rsquo;s the routing key for your tenant and cannot be changed after creation. Choose it carefully.</p>
</div>

<h2>Key concepts</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Term</th><th style="text-align:left">Meaning</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left"><code>Tenant</code></td><td style="text-align:left">Your isolated workspace — one subdomain, one set of users, one set of data.</td></tr>
    <tr><td style="text-align:left"><code>Subdomain</code></td><td style="text-align:left">The unique name in your URL (e.g., <code>acme</code> in <code>acme.example.com</code>).</td></tr>
    <tr><td style="text-align:left"><code>Owner</code></td><td style="text-align:left">The first user of a tenant. Has full control including billing, branding, and member management.</td></tr>
    <tr><td style="text-align:left"><code>Admin</code></td><td style="text-align:left">A member with elevated privileges — can manage users and moderate content.</td></tr>
    <tr><td style="text-align:left"><code>Member</code></td><td style="text-align:left">A standard user — can sign in and use the workspace but cannot manage other users.</td></tr>
  </tbody>
</table>
`,
    sort_order: 1,
  },
  {
    role: 'owner',
    title: 'Tenant Isolation',
    body: `
<p>CITGROUP TENANCY SYSTEM is built on a foundation of hard tenant isolation. Every boundary is enforced at multiple layers — routing, data access, and authorization — so that one customer&rsquo;s data can never leak into another&rsquo;s workspace.</p>

<h2>How isolation works at each layer</h2>

<h3>1. Routing layer (the proxy)</h3>
<p>Every HTTP request arrives at the edge proxy first. The proxy inspects the <code>Host</code> header, extracts the subdomain, and rewrites the request to your tenant&rsquo;s isolated route. Requests for <code>acme.example.com</code> never reach the code path that handles <code>globex.example.com</code>.</p>

<h3>2. Data layer (the database)</h3>
<p>Every table that stores tenant-owned data carries a <code>tenant_id</code> column. Every query is automatically filtered by the authenticated tenant ID, enforced by foreign keys at the schema level:</p>

<pre><code>SELECT * FROM records WHERE tenant_id = ?  -- always scoped
-- tenant_id comes from the authenticated session, never from the client</code></pre>

<h3>3. Session layer</h3>
<p>Your session cookie carries your tenant ID. The server re-derives your tenant from the request host on every call. A session minted for <code>acme</code> cannot be used to address <code>globex</code> data — the server checks that the session&rsquo;s tenant ID matches the request&rsquo;s subdomain.</p>

<h2>What this means for you</h2>
<ul>
  <li><strong>Complete data separation:</strong> No other customer can read or modify your records, files, or settings — not even by accident.</li>
  <li><strong>No shared state:</strong> Your sessions, uploads, and records live in their own namespace.</li>
  <li><strong>Session safety:</strong> A session cookie from one tenant cannot be promoted into another by changing the URL in the address bar.</li>
</ul>

<div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Architectural note:</strong> Isolation is derived from the request, not from a value the client can send. There is no code path that returns rows outside the active tenant scope — this is enforced by the schema, not by convention.</p>
</div>

<h2>What is NOT shared</h2>
<ul>
  <li>Database rows (every row carries your <code>tenant_id</code>)</li>
  <li>Session cookies (scoped to your host)</li>
  <li>File uploads (keyed by tenant ID)</li>
  <li>Rate-limit counters (counted per tenant context)</li>
</ul>
`,
    sort_order: 2,
  },
  {
    role: 'owner',
    title: 'Billing & Usage',
    body: `
<p>As the workspace owner, you&rsquo;re responsible for your tenant&rsquo;s subscription and billing. All billing actions are performed from the Settings page in your dashboard.</p>

<h2>Usage metrics</h2>
<p>The dashboard tracks three core metrics for your tenant:</p>

<table>
  <thead>
    <tr><th style="text-align:left">Metric</th><th style="text-align:left">What it counts</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left"><code>tenant_users</code></td><td style="text-align:left">Active and inactive members in your workspace</td></tr>
    <tr><td style="text-align:left"><code>tenant_sessions</code></td><td style="text-align:left">Active and expired authentication sessions</td></tr>
    <tr><td style="text-align:left"><code>contact_enquiries</code></td><td style="text-align:left">Support requests submitted through your public contact form</td></tr>
  </tbody>
</table>

<h2>Invoices</h2>
<p>Invoices are generated monthly and itemise your usage against your subscription plan. You can view and download past invoices from the Billing tab at any time.</p>

<h2>Payment methods</h2>
<p>Supported payment methods include credit card and bank transfer. To add or update a payment method:</p>
<ol>
  <li>Go to Settings &gt; Billing.</li>
  <li>Select &ldquo;Add payment method&rdquo;.</li>
  <li>Enter your card or bank details securely (we never store raw card numbers).</li>
  <li>Set as default for future invoices.</li>
</ol>

<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Important:</strong> If your subscription lapses, your tenant remains accessible (you can still sign in and view data) but new member invitations and data writes may be restricted until payment is resolved.</p>
</div>

<h2>Usage quotas</h2>
<p>Each subscription tier includes a set of usage allowances. If you consistently exceed your quota, you&rsquo;ll be prompted to upgrade. Contact sales to discuss enterprise plans with higher limits.</p>
`,
    sort_order: 3,
  },
  {
    role: 'owner',
    title: 'Member Management',
    body: `
<p>As the workspace owner, you control who joins your tenant and what they can do. Member management lives on the Members page of your dashboard.</p>

<h2>Roles and permissions</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Role</th><th style="text-align:left">Can</th><th style="text-align:left">Cannot</th></tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left"><strong>Owner</strong></td>
      <td style="text-align:left">Full control — billing, branding, members, settings, delete tenant</td>
      <td style="text-align:left">None — full access</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Admin</strong></td>
      <td style="text-align:left">Manage members, moderate content, access admin features</td>
      <td style="text-align:left">Change billing, delete tenant, change owner role</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Member</strong></td>
      <td style="text-align:left">Sign in, use workspace, update own profile</td>
      <td style="text-align:left">Manage other users, change settings, access billing</td>
    </tr>
  </tbody>
</table>

<h2>Inviting a member</h2>
<ol>
  <li>Go to the Members page in your dashboard.</li>
  <li>Click &ldquo;Invite member&rdquo;.</li>
  <li>Enter their work email address.</li>
  <li>Select their role (owner, admin, or member).</li>
  <li>Click &ldquo;Send invitation&rdquo;.</li>
</ol>
<p>The invitee receives an email with a temporary password. They&rsquo;ll be prompted to change it on first sign in.</p>

<h2>Changing a role</h2>
<ol>
  <li>Find the member in the Members list.</li>
  <li>Select their new role from the dropdown.</li>
  <li>Click &ldquo;Save role&rdquo;.</li>
</ol>

<h2>Suspending or restoring a member</h2>
<p>If a member leaves the company or you need to temporarily block access, you can suspend them. A suspended member cannot sign in but their data remains intact. To restore access, toggle their status back to active.</p>

<h2>Removing a member</h2>
<p>Removing a member deletes their user record from your tenant. Their data (e.g., records they created) remains associated with the tenant but is no longer attributed to an active user.</p>

<div style="background:#f8d7da;border-left:4px solid #dc3545;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Protection:</strong> A tenant must always keep at least one owner. You cannot demote, suspend, or remove the last owner.</p>
</div>
`,
    sort_order: 4,
  },
  {
    role: 'owner',
    title: 'Branding & Customization',
    body: `
<p>Your tenant&rsquo;s public page and dashboard can be customised with your own branding. All branding changes are made from the Settings page.</p>

<h2>Tenant emoji</h2>
<p>The emoji appears on your tenant&rsquo;s public page, in the dashboard header, and in member lists. Choose an emoji that represents your brand or team.</p>
<ul>
  <li>Maximum 10 characters.</li>
  <li>Must be a valid emoji character.</li>
  <li>Changes are applied immediately across all pages.</li>
</ul>

<h2>Subdomain</h2>
<p>Your subdomain is chosen at registration and cannot be changed. It&rsquo;s part of your tenant&rsquo;s URL (e.g., <code>acme.example.com</code>) and is used in routing, session scoping, and data isolation. If you need a different subdomain, you must create a new tenant.</p>

<div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Naming rules:</strong> Subdomains may only contain lowercase letters, numbers, and hyphens. They must be between 3 and 63 characters and must survive sanitisation unchanged — values that change under sanitisation are rejected rather than silently cleaned.</p>
</div>

<h2>Where branding appears</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Location</th><th style="text-align:left">What shows</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left">Tenant public page</td><td style="text-align:left">Your emoji and subdomain at the top</td></tr>
    <tr><td style="text-align:left">Dashboard header</td><td style="text-align:left">Your emoji and subdomain name</td></tr>
    <tr><td style="text-align:left">Member cards</td><td style="text-align:left">Initial letter with your brand colour</td></tr>
    <tr><td style="text-align:left">Admin settings</td><td style="text-align:left">Emoji preview next to settings fields</td></tr>
  </tbody>
</table>
`,
    sort_order: 5,
  },
];

// ═════════════════════════════════════════════════════════════════════════════════
// ADMIN — platform administration documentation
// ═════════════════════════════════════════════════════════════════════════════════
const ADMIN_SECTIONS: DocSection[] = [
  {
    role: 'admin',
    title: 'Security & Sessions',
    body: `
<p>Admin sessions control access to privileged platform actions. This section explains how sessions work, how they&rsquo;re protected, and how to manage them.</p>

<h2>Session architecture</h2>
<ul>
  <li><strong>Signed tokens:</strong> Admin sessions are HS256-signed JWT cookies. They cannot be forged without the server&rsquo;s signing secret.</li>
  <li><code>httpOnly</code>:</td> Session cookies are inaccessible to JavaScript, preventing XSS theft.</li>
  <li><code>SameSite=Lax</code>:</td> Cookies are not sent on cross-site requests, preventing CSRF.</li>
  <li><code>httpOnly</code>:</td> Session cookies are inaccessible to JavaScript, preventing XSS theft.</li>
  <li><strong>Short expiry:</strong> Admin sessions expire after 8 hours; tenant sessions after 24 hours.</li>
</ul>

<h2>Session revocation</h2>
<p>The server records every active session in the database. When you sign out or an administrator revokes a session, the corresponding database row is deleted and the session is rejected on the next request — even if the cookie is still present in the browser.</p>

<p>You can view and revoke your active sessions from the Active Sessions page in the admin dashboard.</p>

<h2>Brute-force protection</h2>
<ul>
  <li>Failed sign-ins increment a per-IP counter in the durable store.</li>
  <li>The limit is 5 failed attempts per 15-minute window.</li>
  <li>Because counters live in the database (not process memory), the limit holds across all app instances and survives restarts.</li>
  <li>The sign-in form reports how many minutes remain before the lockout expires.</li>
</ul>

<div style="background:#f8d7da;border-left:4px solid #dc3545;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Warning:</strong> After 5 failed attempts within 15 minutes, the account is temporarily locked. The lockout window is shown on the sign-in form. Do not attempt to sign in again until the timer expires.</p>
</div>

<h2>Admin session vs tenant session</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Aspect</th><th style="text-align:left">Admin session</th><th style="text-align:left">Tenant session</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left">Cookie name</td><td style="text-align:left"><code>admin_session</code></td><td style="text-align:left"><code>tenant_session</code></td></tr>
    <tr><td style="text-align:left">Expiry</td><td style="text-align:left">8 hours</td><td style="text-align:left">24 hours</td></tr>
    <tr><td style="text-align:left">Scope</td><td style="text-align:left">Admin area ({ADMIN_PATH})</td><td style="text-align:left">Tenant workspace ({subdomain})</td></tr>
    <tr><td style="text-align:left">Revocation</td><td style="text-align:left">Via admin sessions page</td><td style="text-align:left">Automatic on tenant logout</td></tr>
  </tbody>
</table>
`,
    sort_order: 1,
  },
  {
    role: 'admin',
    title: 'API Reference',
    body: `
<p>The CITGROUP TENANCY SYSTEM JSON API provides programmatic access to tenant management. All responses use a single envelope: <code>{ ok: true, data }</code> or <code>{ ok: false, error }</code>.</p>

<h2>Authentication</h2>
<p>Two authorisation methods are supported:</p>

<h3>1. Admin session cookie</h3>
<p>Set by the admin login action. Sent automatically by the browser on subsequent requests. Suitable for browser-based dashboard access.</p>

<h3>2. Machine key</h3>
<p>Present the secret in the <code>Authorization: Bearer</code> header or <code>x-api-key</code> header. Machine keys are configured via the <code>API_KEYS</code> environment variable as comma-separated <code>name:secret</code> pairs:</p>

<pre><code>API_KEYS=integration-1:sk_live_abc123,integration-2:sk_live_def456</code></pre>

<h2>Endpoints</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Method</th><th style="text-align:left">Path</th><th style="text-align:left">Description</th><th style="text-align:left">Auth</th><th style="text-align:left">Rate limited</th></tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left">GET</td>
      <td style="text-align:left"><code>/api/v1/tenants</code></td>
      <td style="text-align:left">List all tenants</td>
      <td style="text-align:left">Session or API key</td>
      <td style="text-align:left">Yes</td>
    </tr>
    <tr>
      <td style="text-align:left">POST</td>
      <td style="text-align:left"><code>/api/v1/tenants</code></td>
      <td style="text-align:left">Create a tenant and its owner</td>
      <td style="text-align:left">Session or API key</td>
      <td style="text-align:left">Yes (10/IP/hour)</td>
    </tr>
    <tr>
      <td style="text-align:left">GET</td>
      <td style="text-align:left"><code>/api/v1/tenants/{subdomain}</code></td>
      <td style="text-align:left">Read one tenant</td>
      <td style="text-align:left">Session or API key</td>
      <td style="text-align:left">Yes</td>
    </tr>
    <tr>
      <td style="text-align:left">PATCH</td>
      <td style="text-align:left"><code>/api/v1/tenants/{subdomain}</code></td>
      <td style="text-align:left">Update tenant branding (emoji)</td>
      <td style="text-align:left">Session or API key</td>
      <td style="text-align:left">Yes</td>
    </tr>
    <tr>
      <td style="text-align:left">DELETE</td>
      <td style="text-align:left"><code>/api/v1/tenants/{subdomain}</code></td>
      <td style="text-align:left">Delete a tenant and all data</td>
      <td style="text-align:left">Session or API key</td>
      <td style="text-align:left">Yes</td>
    </tr>
    <tr>
      <td style="text-align:left">GET</td>
      <td style="text-align:left"><code>/api/health</code></td>
      <td style="text-align:left">Health check</td>
      <td style="text-align:left">None (public)</td>
      <td style="text-align:left">No</td>
    </tr>
  </tbody>
</table>

<h2>Response envelope</h2>
<p>Every API response follows this format:</p>

<pre><code>// Success
{ "ok": true, "data": { ... } }

// Failure
{ "ok": false, "error": { "code": "not_found", "message": "Tenant not found" } }</code></pre>

<h2>Rate limits</h2>
<ul>
  <li>Tenant creation: 10 per IP per hour</li>
  <li>All mutating endpoints: rate limited per IP</li>
  <li>Rate limit responses include <code>Retry-After</code> seconds</td>
</ul>

<div style="background:#e7f1ff;border-left:4px solid #005cb3;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Health endpoint:</strong> <code>GET /api/health</code> is the only unauthenticated route and returns no sensitive data.</p>
</div>
`,
    sort_order: 2,
  },
  {
    role: 'admin',
    title: 'Content Moderation',
    body: `
<p>Contact enquiries submitted through tenant contact forms are routed to the admin moderation queue. Each enquiry is tagged with a category and can be reviewed, assigned, and resolved.</p>

<h2>Enquiry categories</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Category</th><th style="text-align:left">Typical use</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left">Technical support</td><td style="text-align:left">Bugs, errors, broken features — include subdomain and error text</td></tr>
    <tr><td style="text-align:left">Sales enquiry</td><td style="text-align:left">Pricing, volume discounts, evaluation environments</td></tr>
    <tr><td style="text-align:left">Billing &amp; invoices</td><td style="text-align:left">Payment questions, invoice disputes, subscription changes</td></tr>
    <tr><td style="text-align:left">Partnership</td><td style="text-align:left">Resellers, integrators, technology partners</td></tr>
    <tr><td style="text-align:left">Product feedback</td><td style="text-align:left">Feature suggestions, UX feedback, improvement ideas</td></tr>
    <tr><td style="text-align:left">Something else</td><td style="text-align:left">Anything not covered above</td></tr>
  </tbody>
</table>

<h2>Moderation workflow</h2>
<ol>
  <li><strong>Receive:</strong> An enquiry is submitted via the contact form and appears in the moderation queue.</li>
  <li><strong>Categorise:</strong> Verify or adjust the enquiry category.</li>
  <li><strong>Assign:</strong> Assign to a team member (or self-assign).</li>
  <li><strong>Respond:</strong> Reply to the enquirer via email.</li>
  <li><strong>Resolve:</strong> Mark the enquiry as resolved.</li>
</ol>

<h2>Retention policy</h2>
<p>Contact enquiries are retained for 12 months, then automatically deleted. This ensures compliance with data retention policies while keeping the moderation queue manageable.</p>

<h2>Bot protection</h2>
<p>All contact forms include a honeypot field — a hidden field that real browsers leave empty but automated bots often fill in. Submissions with a completed honeypot field are silently accepted and dropped; the sender is not notified they were caught.</p>
`,
    sort_order: 3,
  },
  {
    role: 'admin',
    title: 'User Management',
    body: `
<p>Admins can create, edit, suspend, and remove users across all tenants. User management is performed from the admin dashboard.</p>

<h2>Creating an admin user</h2>
<ol>
  <li>Go to the Admin Dashboard &gt; Members.</li>
  <li>Click &ldquo;Invite member&rdquo;.</li>
  <li>Enter their work email address.</li>
  <li>Select their role (owner, admin, or member).</li>
  <li>A temporary password is generated and displayed — share it securely with the invitee.</li>
  <li>The invitee signs in with the temporary password and is prompted to change it.</li>
</ol>

<h2>Changing a user&rsquo;s role</h2>
<ol>
  <li>Find the user in the Members list.</li>
  <li>Select their new role from the dropdown.</li>
  <li>Click &ldquo;Save role&rdquo;.</li>
</ol>

<h2>Suspending and restoring users</h2>
<p>Suspending a user prevents them from signing in but preserves all their data. To restore access, toggle their status back to active.</p>

<h2>Removing a user</h2>
<p>Removing a user deletes their user record. Any data they created remains associated with the tenant but is no longer attributed to an active user.</p>

<div style="background:#f8d7da;border-left:4px solid #dc3545;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Protection:</strong> A tenant must always keep at least one owner. The last owner cannot be demoted, suspended, or removed.</p>
</div>

<h2>Session management</h2>
<p>Admins can view and revoke active sessions from the Active Sessions page. Revoking a session deletes its database row, logging the user out on their next request.</p>
`,
    sort_order: 4,
  },
  {
    role: 'admin',
    title: 'Rate Limiting',
    body: `
<p>Rate limiting protects the platform from abuse and ensures fair resource allocation across all tenants. Counters live in the durable store (database), so limits hold across all app instances and survive restarts.</p>

<h2>How rate limits work</h2>
<ul>
  <li><strong>Per-IP tracking:</strong> Counters are keyed by IP address (derived from <code>X-Forwarded-For</code> or <code>X-Real-IP</code> headers).</li>
  <li><strong>Fixed windows:</strong> Each limit uses a fixed time window. The counter resets when the window expires.</li>
  <li><strong>Durable storage:</strong> Counters live in the database, not process memory, so they survive restarts and apply across all instances.</li>
</ul>

<h2>Rate limits by endpoint</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Endpoint</th><th style="text-align:left">Limit</th><th style="text-align:left">Window</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left">Tenant creation (POST)</td><td style="text-align:left">10 requests</td><td style="text-align:left">1 hour per IP</td></tr>
    <tr><td style="text-align:left">Admin login</td><td style="text-align:left">5 attempts</td><td style="text-align:left">15 minutes per IP</td></tr>
    <tr><td style="text-align:left">SAM chat</td><td style="text-align:left">20 requests</td><td style="text-align:left">15 minutes per IP</td></tr>
    <tr><td style="text-align:left">Contact enquiries</td><td style="text-align:left">5 messages</td><td style="text-align:left">1 hour per IP</td></tr>
    <tr><td style="text-align:left">Admin invites</td><td style="text-align:left">20 invitations</td><td style="text-align:left">1 hour per IP</td></tr>
    <tr><td style="text-align:left">Admin deletes</td><td style="text-align:left">20 deletes</td><td style="text-align:left">15 minutes per IP</td></tr>
  </tbody>
</table>

<h2>When a limit is exceeded</h2>
<p>The API returns a 429 Too Many Requests response with a <code>Retry-After</code> header indicating how many seconds remain in the current window:</p>

<pre><code>HTTP/1.1 429 Too Many Requests
Retry-After: 842
Content-Type: application/json

{ "ok": false, "error": { "code": "rate_limited", "message": "Too many requests. Try again in 14 minutes." } }</code></pre>

<div style="background:#e7f1ff;border-left:4px solid #005cb3;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Note:</strong> The health endpoint (<code>/api/health</code>) is the only unauthenticated route and is not rate-limited.</p>
</div>
`,
    sort_order: 5,
  },
  {
    role: 'admin',
    title: 'Tenant Management',
    body: `
<p>Admins can create, view, and delete tenants across the entire platform. All tenant management actions are performed from the Admin Dashboard.</p>

<h2>Creating a tenant</h2>
<ol>
  <li>Go to the Admin Dashboard.</li>
  <li>Click &ldquo;Create tenant&rdquo;.</li>
  <li>Enter a subdomain (lowercase letters, numbers, hyphens only, 3&ndash;63 characters).</li>
  <li>Enter the owner&rsquo;s email address.</li>
  <li>Enter a password (8+ characters).</li>
  <li>Click &ldquo;Create tenant&rdquo;.</li>
</ol>
<p>The tenant is provisioned instantly and the owner is signed in automatically.</p>

<h2>Listing tenants</h2>
<p>The Admin Dashboard shows all tenants with their subdomain, owner email, member count, and creation date. Use the search and sort controls to find specific tenants.</p>

<h2>Deleting a tenant</h2>
<p>Deleting a tenant permanently removes all associated data:</p>
<ul>
  <li>The tenant row and all tenant users</li>
  <li>All tenant sessions</li>
  <li>All conversations, messages, and escalations</li>
  <li>All tenant-specific key/value store entries</li>
</ul>

<div style="background:#f8d7da;border-left:4px solid #dc3545;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Warning:</strong> Tenant deletion is irreversible. All data is permanently lost. Ensure you have exported any required data before deleting.</p>
</div>

<h2>Rate limiting</h2>
<p>Tenant creation is limited to 10 per IP per hour. Admin delete actions are limited to 20 per IP per 15 minutes.</p>
`,
    sort_order: 5,
  },
];

// ═════════════════════════════════════════════════════════════════════════════════
// MEMBER — tenant workspace documentation
// ═════════════════════════════════════════════════════════════════════════════════
const MEMBER_SECTIONS: DocSection[] = [
  {
    role: 'member',
    title: 'Getting Started',
    body: `
<p>Welcome to your CITGROUP TENANCY SYSTEM workspace. As a member, you can sign in, collaborate with your team, and manage your own profile.</p>

<h2>Your dashboard</h2>
<p>Your tenant dashboard shows:</p>
<ul>
  <li>Your tenant&rsquo;s emoji, subdomain, and creation date.</li>
  <li>The number of members in your workspace.</li>
  <li>A link to sign in to your tenant workspace from the public subdomain page.</li>
</ul>

<h2>What you can do as a member</h2>
<ul>
  <li>View tenant information and the member list.</li>
  <li>Update your own profile (name, email).</li>
  <li>Change your password.</li>
  <li>Submit support requests via the contact form.</li>
  <li>Sign in and out of your workspace.</li>
</ul>

<h2>What you cannot do</h2>
<ul>
  <li>Invite or remove other members.</li>
  <li>Change another member&rsquo;s role.</li>
  <li>Access billing or subscription settings.</li>
  <li>Change tenant branding or subdomain.</li>
  <li>Delete the tenant.</li>
</ul>

<div style="background:#f0f7ff;border-left:4px solid #0078E2;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Tip:</strong> Your tenant is reachable at <code>{subdomain}.{rootDomain}</code>. Bookmark this URL for quick access.</p>
</div>

<h2>Signing in</h2>
<ol>
  <li>Go to your tenant&rsquo;s sign-in page: <code>{subdomain}.{rootDomain}/auth/login</code>.</li>
  <li>Enter your work email and password.</li>
  <li>If you&rsquo;ve forgotten your password, use the &ldquo;Forgotten your password?&rdquo; link to request a reset.</li>
</ol>
`,
    sort_order: 1,
  },
  {
    role: 'member',
    title: 'Profile Settings',
    body: `
<p>Manage your personal information within your tenant workspace from the Profile page.</p>

<h2>Editable fields</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Field</th><th style="text-align:left">Description</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left"><strong>Name</strong></td><td style="text-align:left">Your display name within the workspace — shown to other members.</td></tr>
    <tr><td style="text-align:left"><strong>Email</strong></td><td style="text-align:left">Your work email address — used for sign-in and notifications.</td></tr>
    <tr><td style="text-align:left"><strong>Password</strong></td><td style="text-align:left">Your sign-in password — must be at least 8 characters.</td></tr>
  </tbody>
</table>

<h2>Changing your password</h2>
<ol>
  <li>Go to Profile Settings.</li>
  <li>Enter your current password.</li>
  <li>Enter your new password (minimum 8 characters).</li>
  <li>Confirm the new password.</li>
  <li>Click &ldquo;Save changes&rdquo;.</li>
</ol>

<div style="background:#d4edda;border-left:4px solid #28a745;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Note:</strong> Passwords are stored as salted scrypt hashes — a memory-hard key derivation function. No plaintext passwords are ever stored or compared in the codebase.</p>
</div>

<h2>Password requirements</h2>
<ul>
  <li>Minimum 8 characters.</li>
  <li>Maximum 200 characters.</li>
  <li>No restrictions on character types (letters, numbers, symbols all allowed).</li>
</ul>

<div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Best practice:</strong> Use a long passphrase (e.g., three random words) rather than a short complex password. Passphrases are easier to remember and harder to crack.</p>
</div>
`,
    sort_order: 2,
  },
  {
    role: 'member',
    title: 'Support Requests',
    body: `
<p>Submit support requests via the contact form on your tenant&rsquo;s public page. Enquiries are routed to the support team and answered within one business day.</p>

<h2>What to include in your request</h2>
<p>To get the fastest resolution, include as much of the following as possible:</p>
<ul>
  <li><strong>Your tenant subdomain</strong> — e.g., <code>acme</code> from <code>acme.example.com</code>.</li>
  <li><strong>Your account email</strong> — the email you use to sign in.</li>
  <li><strong>The exact error text</strong> — copy and paste the full error message if you saw one.</li>
  <li><strong>The time it occurred</strong> — including your time zone.</li>
  <li><strong>A screenshot</strong> — if the issue involves a visual problem or unexpected UI behaviour.</li>
</ul>

<h2>Support categories</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Category</th><th style="text-align:left">When to use</th></tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left"><strong>Technical support</strong></td>
      <td style="text-align:left">Something is broken — include subdomain, error message, and time.</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Sales enquiries</strong></td>
      <td style="text-align:left">Pricing, volume discounts, evaluation environments, rollout planning.</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Billing &amp; invoices</strong></td>
      <td style="text-align:left">Questions about invoices, payments, or subscription changes.</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Partnership</strong></td>
      <td style="text-align:left">Resellers, integrators, and technology partners.</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Product feedback</strong></td>
      <td style="text-align:left">Feature suggestions, UX feedback, improvement ideas.</td>
    </tr>
    <tr>
      <td style="text-align:left"><strong>Something else</strong></td>
      <td style="text-align:left">Anything not covered by the above categories.</td>
    </tr>
  </tbody>
</table>

<h2>Response times</h2>
<table>
  <thead>
    <tr><th style="text-align:left">Priority</th><th style="text-align:left">Response time</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:left">Technical support</td><td style="text-align:left">Within one business day</td></tr>
    <tr><td style="text-align:left">Sales and partnership</td><td style="text-align:left">Within two business days</td></tr>
    <tr><td style="text-align:left">Data-access or security questions</td><td style="text-align:left">Triaged immediately</td></tr>
  </tbody>
</table>

<div style="background:#e7f1ff;border-left:4px solid #005cb3;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Security tip:</strong> Never include your password in a support request. If we need you to reset your password, we&rsquo;ll guide you through the secure reset process.</p>
</div>
`,
    sort_order: 3,
  },
  {
    role: 'member',
    title: 'Tenant Overview',
    body: `
<p>Your tenant is your isolated workspace on the CITGROUP TENANCY SYSTEM platform. This page explains what a tenant is and how to identify yours.</p>

<h2>What is a tenant?</h2>
<p>A tenant is one isolated workspace. It includes:</p>
<ul>
  <li><strong>A dedicated subdomain</strong> — e.g., <code>acme.example.com</code>.</li>
  <li><strong>A set of users</strong> — you and your colleagues who share the workspace.</li>
  <li><strong>Its own rows in every table</strong> — your data is scoped to your tenant ID and cannot be accessed by other tenants.</li>
</ul>

<h2>Your tenant&rsquo;s subdomain</h2>
<p>Your subdomain is part of your public URL. It appears in:</p>
<ul>
  <li>The address bar when you sign in.</li>
  <li>Links in invitation emails.</li>
  <li>Support requests (always include it when contacting support).</li>
</ul>
<p>Your subdomain is <strong>immutable</strong> — it cannot be changed after creation. If you need a different subdomain, you must create a new tenant.</p>

<h2>Member count and activity</h2>
<p>Your dashboard shows:</p>
<ul>
  <li>How many members are in your workspace.</li>
  <li>Who the owner is.</li>
  <li>When the tenant was created.</li>
</ul>

<h2>Workspace boundaries</h2>
<p>Everything you do in your tenant is scoped to your tenant ID:</p>
<ul>
  <li>Data you create is tagged with your tenant ID.</li>
  <li>Queries always filter by your authenticated tenant ID.</li>
  <li>No other tenant&rsquo;s data can appear in your workspace.</li>
  <li>Your session is bound to your tenant and cannot access another tenant&rsquo;s data.</li>
</ul>

<div style="background:#f0f7ff;border-left:4px solid #0078E2;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>Remember:</strong> Your subdomain is the routing key for your tenant. It cannot be changed. If you need a different subdomain, contact your administrator to provision a new tenant.</p>
</div>
`,
    sort_order: 4,
  },
  {
    role: 'member',
    title: 'Password & Security',
    body: `
<p>Your account security is important. This page explains how passwords work and how to keep your account safe.</p>

<h2>Password requirements</h2>
<ul>
  <li><strong>Minimum 8 characters.</strong></li>
  <li>Maximum 200 characters.</li>
  <li>No restrictions on character types — letters, numbers, and symbols are all allowed.</li>
</ul>

<h2>Changing your password</h2>
<ol>
  <li>Go to Profile Settings.</li>
  <li>Enter your current password.</li>
  <li>Enter your new password (8+ characters).</li>
  <li>Confirm your new password.</li>
  <li>Click &ldquo;Save changes&rdquo;.</li>
</ol>

<h2>Forgotten your password?</h2>
<ol>
  <li>Go to the sign-in page.</li>
  <li>Click &ldquo;Forgotten your password?&rdquo;.</li>
  <li>Enter your work email address.</li>
  <li>Check your email for a reset link (valid for 24 hours).</li>
  <li>Follow the link and set a new password.</li>
</ol>

<div style="background:#d4edda;border-left:4px solid #28a745;padding:12px 16px;margin:16px 0;border-radius:4px">
  <p style="margin:0"><strong>How passwords are stored:</strong> Passwords are stored as salted hashes produced by scrypt, a memory-hard key derivation function. No plaintext passwords are ever stored or compared in the codebase.</p>
</div>

<h2>Security best practices</h2>
<ul>
  <li><strong>Use a unique password</strong> — don&rsquo;t reuse passwords from other services.</li>
  <li><strong>Use a passphrase</strong> — three or more random words are easier to remember and harder to crack than short complex passwords.</li>
  <li><strong>Sign out when done</strong> — especially on shared or public computers.</li>
  <li><strong>Never share your password</strong> — CITGROUP support will never ask for your password.</li>
  <li><strong>Report suspicious activity</strong> — if you suspect unauthorised access, contact support immediately.</li>
</ul>

<h2>Security features of the platform</h2>
<ul>
  <li><strong>Signed session cookies:</strong> Your session is a cryptographically signed token that cannot be forged.</li>
  <li><strong>HttpOnly cookies:</strong> Your session cookie cannot be read by JavaScript, preventing XSS theft.</li>
  <li><strong>SameSite=Lax:</strong> Your session cookie is not sent on cross-site requests, preventing CSRF attacks.</li>
  <li><strong>Short expiry:</strong> Tenant sessions expire after 24 hours.</li>
  <li><strong>Constant-time comparison:</strong> Password and session comparisons use constant-time algorithms to prevent timing attacks.</li>
</ul>
`,
    sort_order: 5,
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