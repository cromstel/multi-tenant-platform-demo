-- Seed docs_sections with 3 tiered rows
INSERT INTO docs_sections (role, title, body, sort_order) VALUES
('member', 'Getting Started', 'Welcome to your workspace. Get started with the basics.', 1),
('admin', 'Workspace Management', 'Manage users, roles, and workspace settings.', 2),
('owner', 'Advanced Settings', 'Configure advanced workspace-level options.', 3)
ON DUPLICATE KEY IGNORE;
