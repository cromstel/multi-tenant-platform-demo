-- Seed data for docs_sections tiered by role.
-- Idempotent-safe: tables are created by initializeMySQL() at runtime.
-- The role ENUM is ('owner', 'admin', 'member').

INSERT INTO docs_sections (role, title, body, sort_order) VALUES
('owner',    'Workspace Overview',          'Manage your workspace name, emoji, and visual identity from the Settings menu.', 1),
('owner',    'Tenant Roles',                'Three roles exist: owner (full control), admin (moderate content and users), member (standard access).', 2),
('owner',    'Billing & Usage',             'Review usage snapshots and connect a billing profile in Billing.',           3),
('owner',    'Members Management',          'Invite members, revoke access, and change roles from the Members tab.',      4),
('admin',    'Content',                     'Review and moderate submitted content and support requests.',              1),
('admin',    'Users',                       'Manage tenant users and resolve inactive accounts.',                        2),
('member',   'Help Center',                 'Self-service documentation, searchable by issue or topic.',                 1),
('member',   'Support Requests',            'Submit or track a contact enquiry visible to the Workspace Owner.',           2);
