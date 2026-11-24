import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCentreDb } from "@/backend/db";
import { requireRole } from "@/backend/utils/authGuard";
import { DAY_MS, isRealDate, istEnd, istMonthRange, istStart } from "@/backend/utils/dates";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 1096; // ~3 saal

type CountsRow = { total: number; active: number; suspended: number; expiring: number };
type TotalRow = { total: number };
type AttentionRow = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  plan_name: string | null;
  subscription_expires_at: string;
};
type RecentRow = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  owner_name: string | null;
  created_at: string;
};

type SummaryRow = {
  total: number;
  count: number;
  paying_tenants: number;
};

type PreviousRow = {
  total: number;
  count: number;
};

type MonthRow = {
  month: string;
  total: number;
  count: number;
};

type PaymentRow = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  plan_name: string;
  amount: number;
  pay_date: string;
};

type MonthPoint = {
  month: string;
  total: number;
  count: number;
};

function enumerateMonths(fromDate: string, toDate: string): string[] {
  const [fromYear, fromMonth] = fromDate.split("-").map(Number);
  const [toYear, toMonth] = toDate.split("-").map(Number);

  const months: string[] = [];
  let y = fromYear;
  let m = fromMonth - 1; // 0-indexed

  while (y < toYear || (y === toYear && m <= toMonth - 1)) {
    const mm = String(m + 1).padStart(2, "0");
    months.push(`${y}-${mm}`);
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }

  return months;
}

/* GET /api/admin/dashboard */
export async function getDashboard(request: NextRequest): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const db = getCentreDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const in30 = new Date(now.getTime() + 30 * DAY_MS).toISOString();
  const month = istMonthRange(now); // "is mahine" ka matlab India ka mahina

  // Paanchon queries ek hi round trip me, result usi order me aate hain
  const [countsRes, usersRes, revenueRes, attentionRes, recentRes] = await db.batch([
    db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active,
           COALESCE(SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END), 0) AS suspended,
           COALESCE(SUM(CASE WHEN subscription_expires_at >= ?1 AND subscription_expires_at <= ?2 THEN 1 ELSE 0 END), 0) AS expiring
         FROM tenants
         WHERE deleted_at IS NULL`
      )
      .bind(nowIso, in30),

    // Owner, managers aur staff (admin nahi), jaise frontend ka tenant.users
   db.prepare(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE t.deleted_at IS NULL`
    ),

    db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM subscriptions WHERE pay_date >= ? AND pay_date < ?")
      .bind(month.start, month.end),

    // Expired ya 30 din ke andar khatam hone wale, sabse urgent pehle
    db
      .prepare(
        `SELECT t.id, t.name, t.status, p.name AS plan_name, t.subscription_expires_at
         FROM tenants t
         LEFT JOIN plans p ON p.id = t.current_plan_id
         WHERE t.deleted_at IS NULL AND t.subscription_expires_at <= ?
                  ORDER BY t.subscription_expires_at ASC, t.id ASC
         LIMIT 50`
      )
      .bind(in30),

    db.prepare(
      `SELECT t.id, t.name, t.status, u.name AS owner_name, t.created_at
       FROM tenants t
        LEFT JOIN users u ON u.id = t.owner_user_id
       WHERE t.deleted_at IS NULL
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT 5`
    ),
  ]);

  const counts = (countsRes.results?.[0] ?? {}) as Partial<CountsRow>;
  const users = (usersRes.results?.[0] ?? {}) as Partial<TotalRow>;
  const revenue = (revenueRes.results?.[0] ?? {}) as Partial<TotalRow>;
  const attention = (attentionRes.results ?? []) as AttentionRow[];
  const recent = (recentRes.results ?? []) as RecentRow[];

  return NextResponse.json({
    kpis: {
      totalTenants: counts.total ?? 0,
      activeTenants: counts.active ?? 0,
      suspendedTenants: counts.suspended ?? 0,
      expiringSoon: counts.expiring ?? 0,
      platformUsers: users.total ?? 0,
      revenueThisMonth: revenue.total ?? 0,
    },
    attention: attention.map((t) => ({
      id: t.id,
      name: t.name,
      plan: t.plan_name ?? "",
      status: t.status,
      subscriptionExpiresAt: t.subscription_expires_at,
    })),
    recent: recent.map((t) => ({
      id: t.id,
      name: t.name,
      owner: t.owner_name ?? "",
      status: t.status,
      createdAt: t.created_at,
    })),
  });
}

const revenueQuerySchema = z
  .object({
    from: z
      .string()
      .regex(DATE_RE, "from must be in yyyy-mm-dd format")
      .refine(isRealDate, "from must be a valid calendar date"),
    to: z
      .string()
      .regex(DATE_RE, "to must be in yyyy-mm-dd format")
      .refine(isRealDate, "to must be a valid calendar date"),
    prevFrom: z
      .string()
      .regex(DATE_RE, "prevFrom must be in yyyy-mm-dd format")
      .refine(isRealDate, "prevFrom must be a valid calendar date")
      .optional(),
    prevTo: z
      .string()
      .regex(DATE_RE, "prevTo must be in yyyy-mm-dd format")
      .refine(isRealDate, "prevTo must be a valid calendar date")
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .superRefine((data, ctx) => {
    if (data.from > data.to) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "from must be on or before to",
      });
    }

    const fromMs = Date.parse(`${data.from}T00:00:00Z`);
    const toMs = Date.parse(`${data.to}T00:00:00Z`);
    const spanDays = Math.floor((toMs - fromMs) / DAY_MS) + 1;
    if (spanDays > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      });
    }

    const hasPrevFrom = data.prevFrom !== undefined;
    const hasPrevTo = data.prevTo !== undefined;
    if (hasPrevFrom !== hasPrevTo) {
      ctx.addIssue({
        code: "custom",
        path: [hasPrevFrom ? "prevTo" : "prevFrom"],
        message: "prevFrom and prevTo must be provided together",
      });
    }

    if (data.prevFrom && data.prevTo && data.prevFrom > data.prevTo) {
      ctx.addIssue({
        code: "custom",
        path: ["prevFrom"],
        message: "prevFrom must be on or before prevTo",
      });
    }
  });

/* GET /api/admin/revenue?from=yyyy-mm-dd&to=yyyy-mm-dd */
export async function getRevenue(request: NextRequest): Promise<NextResponse> {
  // 1. Guard
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  // 2. Query check (zod)
  const { searchParams } = new URL(request.url);
  const rawQuery = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    prevFrom: searchParams.get("prevFrom") ?? undefined,
    prevTo: searchParams.get("prevTo") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = revenueQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: z.flattenError(parsed.error) },
      { status: 400 }
    );
  }

  const { from, to, prevFrom, prevTo, page, limit } = parsed.data;
  const db = getCentreDb();

  // 3. Dates ko IST ISO boundaries me badalna
  const startIso = istStart(from);
  const endIso = istEnd(to);
  const hasPrevious = Boolean(prevFrom && prevTo);
  const prevStartIso = hasPrevious ? istStart(prevFrom!) : null;
  const prevEndIso = hasPrevious ? istEnd(prevTo!) : null;
  const offset = (page - 1) * limit;

  // 4. Chaar queries ek db.batch me (sab me amount > 0)
  const summaryStmt = db
    .prepare(
      `SELECT
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS count,
         COUNT(DISTINCT tenant_id) AS paying_tenants
       FROM subscriptions
       WHERE amount > 0
         AND pay_date >= ?
         AND pay_date <= ?`
    )
    .bind(startIso, endIso);

  const previousStmt = hasPrevious
    ? db
        .prepare(
          `SELECT
             COALESCE(SUM(amount), 0) AS total,
             COUNT(*) AS count
           FROM subscriptions
           WHERE amount > 0
             AND pay_date >= ?
             AND pay_date <= ?`
        )
        .bind(prevStartIso!, prevEndIso!)
    : null;

  const byMonthStmt = db
    .prepare(
      `SELECT
         strftime('%Y-%m', datetime(pay_date, '+330 minutes')) AS month,
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS count
       FROM subscriptions
       WHERE amount > 0
         AND pay_date >= ?
         AND pay_date <= ?
       GROUP BY month
       ORDER BY month ASC`
    )
    .bind(startIso, endIso);

  // plan_name subscriptions me payment ke waqt ka saved naam hai (plan rename hone par history nahi badlegi)
  const paymentsStmt = db
    .prepare(
      `SELECT
         s.id,
         s.tenant_id,
         t.name AS tenant_name,
         s.plan_name AS plan_name,
         s.amount,
         s.pay_date
       FROM subscriptions s
       LEFT JOIN tenants t ON t.id = s.tenant_id
       WHERE s.amount > 0
         AND s.pay_date >= ?
         AND s.pay_date <= ?
       ORDER BY s.pay_date DESC, s.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(startIso, endIso, limit + 1, offset);

  const statements = previousStmt
    ? [summaryStmt, previousStmt, byMonthStmt, paymentsStmt]
    : [summaryStmt, byMonthStmt, paymentsStmt];

  const batchResults = await db.batch(statements);

  const summaryRaw = (batchResults[0]?.results?.[0] ?? {}) as Partial<SummaryRow>;
  const prevRaw = hasPrevious
    ? ((batchResults[1]?.results?.[0] ?? {}) as Partial<PreviousRow>)
    : null;
  const monthRows = (batchResults[hasPrevious ? 2 : 1]?.results ?? []) as MonthRow[];
  const paymentRowsRaw = (batchResults[hasPrevious ? 3 : 2]?.results ?? []) as PaymentRow[];

  const summaryTotal = Number(summaryRaw.total ?? 0);
  const summaryCount = Number(summaryRaw.count ?? 0);
  const payingTenants = Number(summaryRaw.paying_tenants ?? 0);
  const average = summaryCount > 0 ? Math.round(summaryTotal / summaryCount) : 0;

  // 5. Khali mahine bharo (zero-fill continuous months)
  const monthMap = new Map<string, MonthPoint>();
  for (const row of monthRows) {
    monthMap.set(row.month, {
      month: row.month,
      total: Number(row.total ?? 0),
      count: Number(row.count ?? 0),
    });
  }

  const byMonth: MonthPoint[] = enumerateMonths(from, to).map(
    (ym) => monthMap.get(ym) ?? { month: ym, total: 0, count: 0 }
  );

  // 6. Pagination slice, invoiceNo & final JSON response
  const hasNextPage = paymentRowsRaw.length > limit;
  const slicedPayments = hasNextPage ? paymentRowsRaw.slice(0, limit) : paymentRowsRaw;

  const payments = slicedPayments.map((row) => ({
    id: row.id,
    invoiceNo: `INV-${String(row.id).slice(0, 8).toUpperCase()}`,
    tenantId: row.tenant_id,
    tenant: row.tenant_name ?? "Unknown Centre",
    plan: row.plan_name,
    amount: Number(row.amount ?? 0),
    payDate: row.pay_date,
  }));

  return NextResponse.json({
    summary: {
      total: summaryTotal,
      count: summaryCount,
      average,
      payingTenants,
    },
    previous: prevRaw
      ? {
          total: Number(prevRaw.total ?? 0),
          count: Number(prevRaw.count ?? 0),
        }
      : null,
    byMonth,
    payments,
    page,
    limit,
    hasNextPage,
  });
}