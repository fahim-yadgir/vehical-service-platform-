import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCentreDb } from "@/backend/db";
import { requireRole } from "@/backend/utils/authGuard";
import { hashPassword } from "@/backend/utils/password";

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

// Pehle trim aur lowercase, phir email check
const emailField = z.string().trim().toLowerCase().max(100).pipe(z.email());
const idSchema = z.uuid();
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pincodeField = z.string().trim().regex(/^\d{6}$/).or(z.literal(""));

const createTenantSchema = z.object({
  centreName: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(100),
  ownerMobile: z.string().trim().regex(/^\d{10}$/),
  ownerEmail: emailField.optional().or(z.literal("")),
  planId: z.string().trim().min(1).max(50),
  address: z.string().trim().max(250).optional(),
  city: z.string().trim().max(100).optional(),
  pincode: pincodeField.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// Plan renew ya badalna: ye ek payment record bhi banata hai (revenue isi se aata hai)
const subscriptionSchema = z.object({
  planId: z.string().trim().min(1).max(50),
  amount: z.number().int().min(1).max(9_999_999),
  payDate: dateField,
  startsOn: dateField,
  endsOn: dateField,
});

const updateTenantSchema = z
  .object({
    centreName: z.string().trim().min(1).max(100).optional(),
    ownerName: z.string().trim().min(1).max(100).optional(),
    mobile: z.string().trim().regex(/^\d{10}$/).optional(),
    email: emailField.optional(),
    status: z.enum(["Active", "Suspended"]).optional(),
    address: z.string().trim().max(250).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    pincode: pincodeField.optional(),
    gstin: z.string().trim().max(30).optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    subscription: subscriptionSchema.optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field is required to update",
  });

const FILTERS = ["all", "new", "old", "expiring", "expired", "active", "suspended"] as const;
type TenantFilter = (typeof FILTERS)[number];

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  filter: z.enum(FILTERS).default("all"),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const NO_STORE = { "Cache-Control": "no-store" };

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

// yyyy-mm-dd asli calendar date hai ya nahi (jaise 2026-02-31 galat hai)
function isRealDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Admin sirf din chunta hai. Server use IST ke hisaab se ek fixed time par ISO banata hai.
const istStart = (day: string) => new Date(`${day}T00:00:00.000+05:30`).toISOString();
const istEnd = (day: string) => new Date(`${day}T23:59:59.999+05:30`).toISOString();

type PlanRow = {
  id: string;
  name: string;
  months: number;
  days: number;
  price: number;
  is_active: number;
};

const PLAN_SQL = "SELECT id, name, months, days, price, is_active FROM plans WHERE id = ?";

/* ------------------------------------------------------------------ */
/* POST /api/admin/tenants                                             */
/* ------------------------------------------------------------------ */

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
  const plan = await db.prepare(PLAN_SQL).bind(data.planId).first<PlanRow>();
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
    { tenantId, mobile: data.ownerMobile, temporaryPassword },
    { status: 201, headers: NO_STORE }
  );
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/tenants?page=&limit=&filter=                         */
/* ------------------------------------------------------------------ */

type ListRow = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  mobile: string | null;
  email: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  owner_name: string | null;
  plan_name: string | null;
  last_pay_date: string | null;
  last_amount: number | null;
};

type CountRow = {
  total: number;
  new_count: number;
  old_count: number;
  expiring_count: number;
  expired_count: number;
  active_count: number;
  suspended_count: number;
};

// Har filter ke liye fixed WHERE (user se SQL kabhi nahi banta), sirf values bind hoti hain
function filterClause(filter: TenantFilter, now: Date): { where: string; binds: string[] } {
  const nowIso = now.toISOString();
  const ago30 = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const in30 = new Date(now.getTime() + 30 * DAY_MS).toISOString();

  switch (filter) {
    case "active":
      return { where: "t.status = 'Active'", binds: [] };
    case "suspended":
      return { where: "t.status = 'Suspended'", binds: [] };
    case "new":
      return { where: "t.created_at >= ?", binds: [ago30] };
    case "old":
      return { where: "t.created_at < ?", binds: [ago30] };
    case "expiring":
      return {
        where: "t.subscription_expires_at >= ? AND t.subscription_expires_at <= ?",
        binds: [nowIso, in30],
      };
    case "expired":
      return { where: "t.subscription_expires_at < ?", binds: [nowIso] };
    default:
      return { where: "1 = 1", binds: [] };
  }
}

export async function tenantsDetails(request: NextRequest): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { page, limit, filter } = parsed.data;
  const offset = (page - 1) * limit;

  const now = new Date();
  const { where, binds } = filterClause(filter, now);
  const db = getCentreDb();

  const listStmt = db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.status,
         t.mobile,
         t.email,
         t.subscription_expires_at,
         t.created_at,
         u.name AS owner_name,
         p.name AS plan_name,
         s.pay_date AS last_pay_date,
         s.amount   AS last_amount
       FROM tenants t
       LEFT JOIN users u ON u.id = t.owner_user_id
       LEFT JOIN plans p ON p.id = t.current_plan_id
       LEFT JOIN subscriptions s ON s.id = (
         SELECT id FROM subscriptions
         WHERE tenant_id = t.id
         ORDER BY ends_on DESC, starts_on DESC, id DESC
         LIMIT 1
       )
       WHERE t.deleted_at IS NULL AND ${where}
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...binds, limit + 1, offset);

  const nowIso = now.toISOString();
  const countStmt = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN created_at >= ?1 THEN 1 ELSE 0 END), 0) AS new_count,
         COALESCE(SUM(CASE WHEN created_at < ?1 THEN 1 ELSE 0 END), 0) AS old_count,
         COALESCE(SUM(CASE WHEN subscription_expires_at >= ?2 AND subscription_expires_at <= ?3 THEN 1 ELSE 0 END), 0) AS expiring_count,
         COALESCE(SUM(CASE WHEN subscription_expires_at < ?2 THEN 1 ELSE 0 END), 0) AS expired_count,
         COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active_count,
         COALESCE(SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END), 0) AS suspended_count
       FROM tenants
       WHERE deleted_at IS NULL`
    )
    .bind(
      new Date(now.getTime() - 30 * DAY_MS).toISOString(),
      nowIso,
      new Date(now.getTime() + 30 * DAY_MS).toISOString()
    );

  const [listResult, countResult] = await db.batch([listStmt, countStmt]);
  const fetched = (listResult.results ?? []) as ListRow[];
  const c = ((countResult.results ?? [])[0] ?? {}) as Partial<CountRow>;

  const hasNextPage = fetched.length > limit;
  const rows = hasNextPage ? fetched.slice(0, limit) : fetched;

  const tenants = rows.map((r) => ({
    id: r.id,
    name: r.name,
    owner: r.owner_name ?? "",
    status: r.status,
    plan: r.plan_name ?? "",
    mobile: r.mobile,
    email: r.email,
    createdAt: r.created_at,
    subscriptionExpiresAt: r.subscription_expires_at,
    lastPayment: r.last_pay_date
      ? { payDate: r.last_pay_date, amount: r.last_amount ?? 0 }
      : null,
  }));

  return NextResponse.json({
    tenants,
    page,
    limit,
    hasNextPage,
    counts: {
      all: c.total ?? 0,
      new: c.new_count ?? 0,
      old: c.old_count ?? 0,
      expiring: c.expiring_count ?? 0,
      expired: c.expired_count ?? 0,
      active: c.active_count ?? 0,
      suspended: c.suspended_count ?? 0,
    },
  });
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/tenants/[id]                                         */
/* ------------------------------------------------------------------ */

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

// GET aur PATCH dono isi se tenant ka poora data lete hain
async function loadTenantDetail(db: D1Database, id: string) {
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
         ORDER BY ends_on DESC, starts_on DESC, id DESC
         LIMIT 1
       )
      WHERE t.id = ? AND t.deleted_at IS NULL`
    )
    .bind(id)
    .first<TenantDetailRow>();

  if (!row) return null;

  return {
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
  };
}

export async function getTenantById(request: NextRequest, id: string): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const tenant = await loadTenantDetail(getCentreDb(), parsedId.data);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json({ tenant });
}

/* ------------------------------------------------------------------ */
/* PATCH /api/admin/tenants/[id]                                       */
/* ------------------------------------------------------------------ */

type ExistingTenantRow = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  current_plan_id: string | null;
  subscription_expires_at: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  owner_mobile: string | null;
  owner_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  lat: number | null;
  lng: number | null;
};

export async function updateTenant(request: NextRequest, id: string): Promise<NextResponse> {
  // 1. Guard + id check
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  // 2. Body parse + Zod validation (khali body -> 400)
  const raw = await request.json().catch(() => null);
  const parsed = updateTenantSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: z.flattenError(parsed.error) },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const db = getCentreDb();
  const now = new Date().toISOString();

  // 3. Maujooda tenant lo. Na mile to 404.
  const current = await db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.status,
         t.current_plan_id,
         t.subscription_expires_at,
         t.owner_user_id,
         u.name   AS owner_name,
         u.mobile AS owner_mobile,
         u.email  AS owner_email,
         tp.address, tp.city, tp.state, tp.pincode, tp.gstin, tp.lat, tp.lng
       FROM tenants t
       LEFT JOIN users u ON u.id = t.owner_user_id
       LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
        WHERE t.id = ? AND t.deleted_at IS NULL`
    )
    .bind(parsedId.data)
    .first<ExistingTenantRow>();

  if (!current) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (!current.owner_user_id || !current.owner_mobile) {
    return NextResponse.json({ error: "This tenant has no owner account" }, { status: 500 });
  }
  const ownerId = current.owner_user_id;

  // 4. Maujooda values aur body ko merge karo
  const nextName = body.centreName ?? current.name;
  const nextOwnerName = body.ownerName ?? current.owner_name ?? "";
  const nextMobile = body.mobile ?? current.owner_mobile;
  const nextEmail = body.email ?? current.owner_email;
  const nextStatus = body.status ?? current.status;
  const nextProfile = {
    address: body.address ?? current.address ?? "",
    city: body.city ?? current.city ?? "",
    state: body.state ?? current.state ?? "",
    pincode: body.pincode ?? current.pincode ?? "",
    gstin: body.gstin ?? current.gstin ?? "",
    lat: body.lat !== undefined ? body.lat : current.lat,
    lng: body.lng !== undefined ? body.lng : current.lng,
  };

  // 5. Subscription (plan renew ya badalna), agar bheji gayi ho
  let nextPlanId = current.current_plan_id;
  let nextExpiry = current.subscription_expires_at;
  let newSub: {
    plan: PlanRow;
    amount: number;
    payAt: string;
    startsAt: string;
    endsAt: string;
  } | null = null;

  if (body.subscription) {
    const s = body.subscription;
    if (![s.payDate, s.startsOn, s.endsOn].every(isRealDate)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const startsAt = istStart(s.startsOn);
    const endsAt = istEnd(s.endsOn);
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: "End date must be after the start date" }, { status: 400 });
    }

    const plan = await db.prepare(PLAN_SQL).bind(s.planId).first<PlanRow>();
    if (!plan || plan.is_active !== 1) {
      return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
    }

    // Double-click ya retry se wahi payment do baar na ban jaye
    const duplicate = await db
      .prepare(
        `SELECT id FROM subscriptions
         WHERE tenant_id = ? AND plan_id = ? AND starts_on = ? AND ends_on = ? AND amount = ?
         LIMIT 1`
      )
      .bind(current.id, plan.id, startsAt, endsAt, s.amount)
      .first<{ id: string }>();
    if (duplicate) {
      return NextResponse.json({ error: "This payment is already recorded" }, { status: 409 });
    }

    newSub = { plan, amount: s.amount, payAt: istStart(s.payDate), startsAt, endsAt };
    nextPlanId = plan.id;
    nextExpiry = endsAt;
  }

  // 6. Expired centre ko bina renew ke Active nahi kar sakte (renew isi request me ho to chalega)
  if (nextStatus === "Active" && current.status === "Suspended") {
    if (!nextExpiry || nextExpiry <= now) {
      return NextResponse.json(
        { error: "Subscription has expired. Renew the plan before activating." },
        { status: 409 }
      );
    }
  }

  // 7. Naya mobile ya email kisi aur user ka to nahi
  const mobileChanged = nextMobile !== current.owner_mobile;
  const emailChanged = nextEmail !== current.owner_email;
  if (mobileChanged || emailChanged) {
    const conflict = await db
      .prepare(
        `SELECT mobile, email FROM users
         WHERE (mobile = ? OR email = ?) AND id <> ?
         LIMIT 1`
      )
      .bind(nextMobile, nextEmail, ownerId)
      .first<{ mobile: string; email: string | null }>();

    if (conflict) {
      const text =
        conflict.mobile === nextMobile
          ? "Mobile number is already in use by another account"
          : "Email is already in use by another account";
      return NextResponse.json({ error: text }, { status: 409 });
    }
  }

  // 8. Sab updates ek transaction me
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE tenants
         SET name = ?, status = ?, mobile = ?, email = ?,
             current_plan_id = ?, subscription_expires_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(nextName, nextStatus, nextMobile, nextEmail, nextPlanId, nextExpiry, now, current.id),

    db
      .prepare(
        `UPDATE users
         SET name = ?, mobile = ?, email = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(nextOwnerName, nextMobile, nextEmail, now, ownerId),

    // Upsert: profile row na ho tab bhi chalta hai
    db
      .prepare(
        `INSERT INTO tenant_profiles (tenant_id, address, city, state, pincode, gstin, lat, lng, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id) DO UPDATE SET
           address = excluded.address,
           city = excluded.city,
           state = excluded.state,
           pincode = excluded.pincode,
           gstin = excluded.gstin,
           lat = excluded.lat,
           lng = excluded.lng,
           updated_at = excluded.updated_at`
      )
      .bind(
        current.id,
        nextProfile.address,
        nextProfile.city,
        nextProfile.state,
        nextProfile.pincode,
        nextProfile.gstin,
        nextProfile.lat,
        nextProfile.lng,
        now
      ),
  ];

  if (newSub) {
    statements.push(
      db
        .prepare(
          `INSERT INTO subscriptions (id, tenant_id, plan_id, plan_name, amount, pay_date, starts_on, ends_on)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          current.id,
          newSub.plan.id,
          newSub.plan.name,
          newSub.amount,
          newSub.payAt,
          newSub.startsAt,
          newSub.endsAt
        )
    );
  }

  // Mobile login ID hai: badalne par owner ke purane sessions band
  if (mobileChanged) {
    statements.push(
      db
        .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
        .bind(now, ownerId)
    );
  }

  try {
    await db.batch(statements);
  } catch (err) {
    // Do requests ek saath aayein to upar ka check dono nikal jata hai, yahan database rok leta hai
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      const text = message.includes("users.email")
        ? "Email is already in use by another account"
        : "Mobile number is already in use by another account";
      return NextResponse.json({ error: text }, { status: 409 });
    }
    throw err;
  }

  // 9. Naya poora tenant wapas, taaki frontend ko dobara fetch na karna pade
  const tenant = await loadTenantDetail(db, current.id);
  return NextResponse.json({ ok: true, tenant });
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/tenants/[id]/history                                 */
/* ------------------------------------------------------------------ */

type HistoryRow = {
  id: string;
  plan_id: string | null;
  plan_name: string;
  amount: number;
  pay_date: string;
  starts_on: string;
  ends_on: string;
};

export async function tenantHistory(request: NextRequest, id: string): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const db = getCentreDb();
  const tenant = await db
    .prepare("SELECT id, name FROM tenants WHERE id = ? AND deleted_at IS NULL")
    .bind(parsedId.data)
    .first<{ id: string; name: string }>();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const rows = await db
    .prepare(
      `SELECT id, plan_id, plan_name, amount, pay_date, starts_on, ends_on
       FROM subscriptions
       WHERE tenant_id = ?
       ORDER BY ends_on DESC, starts_on DESC, id DESC
       LIMIT 200`
    )
    .bind(tenant.id)
    .all<HistoryRow>();

  const history = (rows.results ?? []).map((r) => ({
    id: r.id,
    planId: r.plan_id,
    plan: r.plan_name,
    amount: r.amount,
    payDate: r.pay_date,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
  }));

  return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name }, history });
}

/* ------------------------------------------------------------------ */
/* POST /api/admin/tenants/[id]/reset-password                         */
/* ------------------------------------------------------------------ */

export async function resetTenantPassword(request: NextRequest, id: string): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const db = getCentreDb();
  const owner = await db
    .prepare(
      `SELECT u.id, u.name, u.mobile
       FROM tenants t
       JOIN users u ON u.id = t.owner_user_id
        WHERE t.id = ? AND t.deleted_at IS NULL`
    )
    .bind(parsedId.data)
    .first<{ id: string; name: string; mobile: string }>();

  if (!owner) {
    return NextResponse.json({ error: "Tenant or owner not found" }, { status: 404 });
  }

  const temporaryPassword = generateTemporaryPassword(10);
  const passwordHash = await hashPassword(temporaryPassword);
  const now = new Date().toISOString();

  // Naya password aur purane sabhi sessions ka band hona, ek saath
  await db.batch([
    db
      .prepare("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?")
      .bind(passwordHash, now, owner.id),
    db
      .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
      .bind(now, owner.id),
  ]);

  return NextResponse.json(
    { ownerName: owner.name, mobile: owner.mobile, temporaryPassword },
    { headers: NO_STORE }
  );
}

/* ------------------------------------------------------------------ */
/* DELETE /api/admin/tenants/[id]                                      */
/* ------------------------------------------------------------------ */

export async function deleteTenant(request: NextRequest, id: string): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const db = getCentreDb();
  const tenant = await db
    .prepare("SELECT id, status FROM tenants WHERE id = ? AND deleted_at IS NULL")
    .bind(parsedId.data)
    .first<{ id: string; status: string }>();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (tenant.status !== "Suspended") {
    return NextResponse.json(
      { error: "Suspend the service centre before deleting it" },
      { status: 409 }
    );
  }

  // Soft delete: row, payments (revenue), orders aur reviews rehte hain, sirf tenant chhup jata hai.
  // Users ka mobile aur email khali kar dete hain, taaki wahi mobile naye tenant ke liye use ho sake.
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare("UPDATE tenants SET deleted_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, tenant.id),
    db
      .prepare(
        `UPDATE users
         SET status = 'Suspended', mobile = 'deleted-' || id, email = NULL, updated_at = ?
         WHERE tenant_id = ?`
      )
      .bind(now, tenant.id),
    db
      .prepare(
        `UPDATE sessions SET revoked_at = ?
         WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM users WHERE tenant_id = ?)`
      )
      .bind(now, tenant.id),
    db
      .prepare("DELETE FROM push_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = ?)")
      .bind(tenant.id),
  ]);

  return NextResponse.json({ ok: true });
}