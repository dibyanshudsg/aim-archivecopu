ALTER TABLE admins ADD COLUMN password_hash TEXT;
ALTER TABLE admins ADD COLUMN role_id TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE admins ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admins ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admins ADD COLUMN password_changed_at TEXT;
ALTER TABLE admins ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

CREATE TABLE admin_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_id, permission)
);

CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  subject_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX admin_audit_created ON admin_audit_log(created_at DESC);

INSERT INTO admin_roles (id, name, description, is_system, created_at) VALUES
  ('owner', 'Owner', 'Full access, including account and role management', 1, CURRENT_TIMESTAMP),
  ('editor', 'Content Editor', 'Manage catalogue, publishing and indexing', 1, CURRENT_TIMESTAMP),
  ('viewer', 'Viewer', 'View the admin workspace without making changes', 1, CURRENT_TIMESTAMP);

INSERT INTO admin_role_permissions (role_id, permission) VALUES
  ('editor', 'dashboard.view'), ('editor', 'catalogue.view'), ('editor', 'catalogue.edit'),
  ('editor', 'catalogue.publish'), ('editor', 'indexing.view'), ('editor', 'indexing.manage'),
  ('editor', 'storage.view'), ('editor', 'navigation.view'),
  ('viewer', 'dashboard.view'), ('viewer', 'catalogue.view'),
  ('viewer', 'indexing.view'), ('viewer', 'storage.view'), ('viewer', 'navigation.view');
