-- Migration number: 0001 	 2026-11-17T17:56:51.694Z
-- CUSTOMER_DB
-- Dates: code se ISO-8601 (new Date().toISOString()) bharo, DB defaults nahi.
-- Mobile: sirf 10 digit. Registration no: uppercase aur bina space ke.

--table-1
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  home_lat REAL,
  home_lng REAL,
  home_address TEXT,
  is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
  blocked_reason TEXT,
  blocked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

--table-2
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  registration_no TEXT NOT NULL,
  year INTEGER,
  chassis_no TEXT,
  engine_no TEXT,
  last_service TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (customer_id, registration_no),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

--table-3
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

--table-4
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

--table-5
CREATE TABLE IF NOT EXISTS push_tokens (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  fcm_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- INDEXES
-- UNIQUE columns (mobile, email, token_hash, fcm_token) aur vehicles(customer_id, registration_no)
-- ka index apne aap bana hota hai, to unke liye alag index nahi.
--table-6
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_customer_id ON password_reset_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_customer_id ON push_tokens(customer_id);