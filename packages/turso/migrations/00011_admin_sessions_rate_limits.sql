CREATE TABLE admin_sessions (
  id_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX admin_sessions_admin ON admin_sessions(admin_id, expires_at);

CREATE TABLE rate_limit_buckets (
  key_hash TEXT PRIMARY KEY,
  tokens REAL NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL
);
CREATE INDEX rate_limit_expiry ON rate_limit_buckets(expires_at_ms);
