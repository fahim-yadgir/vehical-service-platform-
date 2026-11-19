-- Migration number: 0001 	 2026-11-18T07:06:11.396Z
-- CENTRE_DB: super admin + service centres (tenants), staff, orders, rates, plans.
-- Dates: code se ISO-8601 bharo. Ids: code se ULID/UUID. Mobile: 10 digit. Email: lowercase.
-- orders.customer_id / vehicle_id aur reviews.customer_id CUSTOMER_DB ke ids hain (cross-DB, isliye FK nahi).

CREATE TABLE plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  tier        TEXT,
  months      INTEGER NOT NULL DEFAULT 0,
  days        INTEGER NOT NULL DEFAULT 0,
  price       INTEGER NOT NULL DEFAULT 0,
  order_limit INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE tenants (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  owner_user_id           TEXT,
  status                  TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
  mobile                  TEXT,
  email                   TEXT,
  current_plan_id         TEXT REFERENCES plans (id),
  subscription_expires_at TEXT,
  db_shard                INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX idx_tenants_status ON tenants (status);

CREATE TABLE users (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT REFERENCES tenants (id) ON DELETE CASCADE,
  role                 TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'manager', 'staff')),
  name                 TEXT NOT NULL,
  mobile               TEXT NOT NULL UNIQUE,
  email                TEXT UNIQUE COLLATE NOCASE,
  password_hash        TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  status               TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
  created_by           TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  CHECK ((role = 'admin' AND tenant_id IS NULL) OR (role <> 'admin' AND tenant_id IS NOT NULL))
);
CREATE INDEX idx_users_tenant_role ON users (tenant_id, role);

CREATE TABLE tenant_profiles (
  tenant_id  TEXT PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  address    TEXT NOT NULL DEFAULT '',
  city       TEXT NOT NULL DEFAULT '',
  state      TEXT NOT NULL DEFAULT 'Maharashtra',
  pincode    TEXT NOT NULL DEFAULT '',
  gstin      TEXT NOT NULL DEFAULT '',
  lat        REAL,
  lng        REAL,
  updated_at TEXT NOT NULL
);

CREATE TABLE subscriptions (
  id        TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  plan_id   TEXT REFERENCES plans (id),
  plan_name TEXT NOT NULL,
  amount    INTEGER NOT NULL DEFAULT 0,
  pay_date  TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on   TEXT NOT NULL
);
CREATE INDEX idx_subscriptions_tenant ON subscriptions (tenant_id, starts_on);

CREATE TABLE rates (
  id        TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  kind      TEXT NOT NULL CHECK (kind IN ('service', 'facility')),
  name      TEXT NOT NULL,
  price     INTEGER NOT NULL DEFAULT 0,
  note      TEXT,
  vehicle   TEXT NOT NULL CHECK (vehicle IN ('Car', 'Bike', 'Both'))
);
CREATE INDEX idx_rates_tenant_kind ON rates (tenant_id, kind);

CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  customer_id       TEXT,
  customer_name     TEXT NOT NULL,
  customer_mobile   TEXT NOT NULL,
  vehicle_id        TEXT,
  vehicle_type      TEXT NOT NULL,
  brand             TEXT NOT NULL,
  model             TEXT NOT NULL,
  registration_no   TEXT NOT NULL,
  year              INTEGER,
  service           TEXT NOT NULL,
  service_date      TEXT NOT NULL,
  time_slot         TEXT,
  amount            INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  source            TEXT NOT NULL DEFAULT 'customer' CHECK (source IN ('customer', 'centre')),
  pickup_lat        REAL,
  pickup_lng        REAL,
  pickup_address    TEXT,
  assigned_staff_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  supervised_by     TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_by_id     TEXT,
  created_by_name   TEXT NOT NULL,
  created_by_role   TEXT NOT NULL,
  responded_by_id   TEXT,
  responded_at      TEXT,
  rejection_reply   TEXT,
  completed_by_id   TEXT,
  completed_at      TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_orders_tenant_status  ON orders (tenant_id, status);
CREATE INDEX idx_orders_tenant_created ON orders (tenant_id, created_at);
CREATE INDEX idx_orders_customer       ON orders (customer_id);
CREATE INDEX idx_orders_staff          ON orders (assigned_staff_id);

CREATE TABLE order_events (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  at         TEXT NOT NULL,
  by_user_id TEXT,
  by_name    TEXT NOT NULL,
  role       TEXT NOT NULL,
  text       TEXT NOT NULL
);
CREATE INDEX idx_order_events_order ON order_events (order_id, at);

CREATE TABLE order_otps (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('pickup', 'delivery')),
  code       TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  used_at    TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (order_id, kind)
);

CREATE TABLE order_proofs (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('pickup', 'delivery')),
  by_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  by_name    TEXT NOT NULL,
  saved_at   TEXT NOT NULL,
  UNIQUE (order_id, kind)
);

CREATE TABLE proof_photos (
  id       TEXT PRIMARY KEY,
  proof_id TEXT NOT NULL REFERENCES order_proofs (id) ON DELETE CASCADE,
  r2_key   TEXT NOT NULL,
  lat      REAL,
  lng      REAL,
  accuracy REAL,
  taken_at TEXT NOT NULL
);
CREATE INDEX idx_proof_photos_proof ON proof_photos (proof_id);

CREATE TABLE reviews (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  public_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_reviews_tenant ON reviews (tenant_id, created_at);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device     TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX idx_sessions_user    ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE password_reset_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_reset_user ON password_reset_tokens (user_id);

CREATE TABLE push_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  fcm_token    TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  last_seen_at TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_push_user ON push_tokens (user_id);