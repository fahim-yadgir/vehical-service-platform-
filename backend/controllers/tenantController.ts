import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCentreDb } from "@/backend/db";
import { requireRole } from "@/backend/utils/authGuard";
import { hashPassword } from "@/backend/utils/password";

// Pehle trim aur lowercase, phir email check
const emailField = z.string().trim().toLowerCase().max(100).pipe(z.email());

const createTenantSchema = z.object({
  centreName: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(100),
  ownerMobile: z.string().trim().regex(/^\d{10}$/),
  ownerEmail: emailField.optional().or(z.literal("")),
  planId: z.string().trim().min(1).max(50),
  address: z.string().trim().max(250).optional(),
  city: z.string().trim().max(100).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/).optional().or(z.literal("")),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
const idSchema = z.uuid();

const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";

function generateTemporaryPassword(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  }
  return result;
}

function calculateExpiryIso(baseDate: Date, months: number, days: number): string {
  const expiry = new Date(baseDate.getTime());
  if (months > 0) {
    expiry.setUTCMonth(expiry.getUTCMonth() + months);
  }
  if (days > 0) {
    expiry.setUTCDate(expiry.getUTCDate() + days);
  }
  return expiry.toISOString();
}

export async function createTenant(request: NextRequest): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const raw = await request.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.flattenError(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const db = getCentreDb();
  const normalizedEmail = data.ownerEmail ? data.ownerEmail : null;

  // 1. Plan fetch aur active check
  const plan = await db
    .prepare("SELECT id, name, months, days, price, is_active FROM plans WHERE id = ?")
    .bind(data.planId)
    .first<{
      id: string;
      name: string;
      months: number;
      days: number;
      price: number;
      is_active: number;
    }>();

  if (!plan || plan.is_active !== 1) {
    return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
  }

  // 2. Duplicate mobile ya email, batch se pehle
  const clash = await db
    .prepare("SELECT mobile, email FROM users WHERE mobile = ? OR email = ?")
    .bind(data.ownerMobile, normalizedEmail)
    .first<{ mobile: string; email: string | null }>();

  if (clash) {
    const message =
      clash.mobile === data.ownerMobile
        ? "This mobile is already registered"
        : "This email is already registered";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  // 3. Temporary password (sirf response me jata hai, kabhi log nahi)
  const temporaryPassword = generateTemporaryPassword(10);
  const passwordHash = await hashPassword(temporaryPassword);

  // 4. IDs, time aur subscription expiry
  const tenantId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const endsOn = calculateExpiryIso(nowDate, plan.months, plan.days);
  const createdBy = guard.user.id;

  // 5. Atomic batch, foreign key ke order me
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO tenants (
             id, name, owner_user_id, status, mobile, email,
             current_plan_id, subscription_expires_at, db_shard,
             created_at, updated_at
           ) VALUES (?, ?, NULL, 'Active', ?, ?, ?, ?, 1, ?, ?)`
        )
        .bind(tenantId, data.centreName, data.ownerMobile, normalizedEmail, plan.id, endsOn, now, now),

      db
        .prepare(
          `INSERT INTO users (
             id, tenant_id, role, name, mobile, email,
             password_hash, must_change_password, status,
             created_by, created_at, updated_at
           ) VALUES (?, ?, 'owner', ?, ?, ?, ?, 1, 'Active', ?, ?, ?)`
        )
        .bind(ownerId, tenantId, data.ownerName, data.ownerMobile, normalizedEmail, passwordHash, createdBy, now, now),

      db
        .prepare("UPDATE tenants SET owner_user_id = ?, updated_at = ? WHERE id = ?")
        .bind(ownerId, now, tenantId),

      db
        .prepare(
          `INSERT INTO tenant_profiles (
             tenant_id, address, city, state, pincode, gstin, lat, lng, updated_at
           ) VALUES (?, ?, ?, 'Maharashtra', ?, '', ?, ?, ?)`
        )
        .bind(
          tenantId,
          data.address ?? "",
          data.city ?? "",
          data.pincode ?? "",
          data.lat ?? null,
          data.lng ?? null,
          now
        ),

      db
        .prepare(
          `INSERT INTO subscriptions (
             id, tenant_id, plan_id, plan_name, amount, pay_date, starts_on, ends_on
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(subscriptionId, tenantId, plan.id, plan.name, plan.price, now, now, endsOn),
    ]);
  } catch (err) {
    // Do requests ek saath aayein to pehla check dono nikal jata hai, yahan database rok leta hai
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      const text = message.includes("users.email")
        ? "This email is already registered"
        : "This mobile is already registered";
      return NextResponse.json({ error: text }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json(
    {
      tenantId,
      mobile: data.ownerMobile,
      temporaryPassword,
    },
    { status: 201 }
  );
}

export async function tenantsDetails(request: NextRequest): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const db = getCentreDb();
  const { searchParams } = request.nextUrl;

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10") || 10));
  const offset = (page - 1) * limit;

  const rows = await db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.owner_user_id,
         u.name AS owner_name,
         t.status,
         t.mobile,
         t.email,
         t.current_plan_id,
         p.name AS plan_name,
         t.subscription_expires_at,
         t.created_at
       FROM tenants t
       LEFT JOIN users u ON u.id = t.owner_user_id
       LEFT JOIN plans p ON p.id = t.current_plan_id
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(limit + 1, offset)
    .all();

  const fetched = rows.results ?? [];
  const hasNextPage = fetched.length > limit;
  const tenants = hasNextPage ? fetched.slice(0, limit) : fetched;

  return NextResponse.json({ tenants, page, limit, hasNextPage });
}
type TenantDetailRow = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  mobile: string | null;
  email: string | null;
  plan_id: string | null;
  plan_name: string | null;
  subscription_expires_at: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  created_at: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  lat: number | null;
  lng: number | null;
  manager_count: number;
  staff_count: number;
  last_plan_name: string | null;
  last_amount: number | null;
  last_pay_date: string | null;
  last_starts_on: string | null;
  last_ends_on: string | null;
};

export async function getTenantById(request: NextRequest, id: string): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const db = getCentreDb();
  const row = await db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.status,
         t.mobile,
         t.email,
         t.current_plan_id AS plan_id,
         t.subscription_expires_at,
         t.owner_user_id,
         t.created_at,
         u.name AS owner_name,
         p.name AS plan_name,
         tp.address, tp.city, tp.state, tp.pincode, tp.gstin, tp.lat, tp.lng,
         (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND role = 'manager') AS manager_count,
         (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND role = 'staff') AS staff_count,
         s.plan_name AS last_plan_name,
         s.amount    AS last_amount,
         s.pay_date  AS last_pay_date,
         s.starts_on AS last_starts_on,
         s.ends_on   AS last_ends_on
       FROM tenants t
       LEFT JOIN users u ON u.id = t.owner_user_id
       LEFT JOIN plans p ON p.id = t.current_plan_id
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
       LEFT JOIN subscriptions s ON s.id = (
         SELECT id FROM subscriptions
         WHERE tenant_id = t.id
         ORDER BY starts_on DESC, pay_date DESC, id DESC
         LIMIT 1
       )
       WHERE t.id = ?`
    )
    .bind(parsedId.data)
    .first<TenantDetailRow>();

  if (!row) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    tenant: {
      id: row.id,
      name: row.name,
      owner: row.owner_name ?? "",
      ownerId: row.owner_user_id,
      status: row.status,
      plan: row.plan_name ?? "",
      planId: row.plan_id,
      mobile: row.mobile,
      email: row.email,
      createdAt: row.created_at,
      subscriptionExpiresAt: row.subscription_expires_at,
      team: {
        managers: row.manager_count,
        staff: row.staff_count,
        total: 1 + row.manager_count + row.staff_count,
      },
      lastSubscription: row.last_plan_name
        ? {
            plan: row.last_plan_name,
            amount: row.last_amount ?? 0,
            payDate: row.last_pay_date,
            startsOn: row.last_starts_on,
            endsOn: row.last_ends_on,
          }
        : null,
      profile: {
        address: row.address ?? "",
        city: row.city ?? "",
        state: row.state ?? "",
        pincode: row.pincode ?? "",
        gstin: row.gstin ?? "",
        lat: row.lat,
        lng: row.lng,
      },
    },
  });
}