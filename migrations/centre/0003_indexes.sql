-- Migration number: 0003 	 2026-11-22T17:31:02.931Z
CREATE INDEX IF NOT EXISTS idx_tenants_created ON tenants (created_at, id);
CREATE INDEX IF NOT EXISTS idx_tenants_expires ON tenants (subscription_expires_at, id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pay_date ON subscriptions (pay_date, amount);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends ON subscriptions (tenant_id, ends_on);