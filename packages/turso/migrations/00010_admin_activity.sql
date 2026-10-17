ALTER TABLE admins ADD COLUMN temporary_password_expires_at TEXT;
UPDATE admins SET temporary_password_expires_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+24 hours')
 WHERE must_change_password=1 AND password_hash IS NOT NULL;
CREATE INDEX admin_audit_action_created ON admin_audit_log(action, created_at DESC);
CREATE INDEX admin_audit_actor_created ON admin_audit_log(actor_id, created_at DESC);
