import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCentreDb } from "@/backend/db";
import { requireRole } from "@/backend/utils/authGuard";

type PlanRow = {
  id: string;
  name: string;
  tier: string | null;
  months: number;
  days: number;
  price: number;
  order_limit: number;
  is_active: number;
};

// Tier ke naam fixed hain, koi apni tier nahi bana sakta. Typo (jaise "silver") 400 deta hai.
const limitsSchema = z.strictObject({
  Silver: z.number().int().min(1).max(100_000).optional(),
  Golden: z.number().int().min(1).max(100_000).optional(),
  Diamond: z.number().int().min(1).max(100_000).optional(),
});

const updatePlansSchema = z
  .strictObject({
    prices: z
      .record(z.string().min(1).max(50), z.number().int().min(0).max(9_999_999))
      .refine((obj) => Object.keys(obj).length <= 30, {
        message: "Too many plan price entries (max 30)",
      })
      .optional(),
    limits: limitsSchema.optional(),
  })
  .refine(
    (data) =>
      Object.keys(data.prices ?? {}).length > 0 || Object.keys(data.limits ?? {}).length > 0,
    { message: "Provide at least one price or tier limit to update" }
  );

// GET aur PATCH dono isi se plans lete hain
async function loadPlans(db: D1Database, isAdmin: boolean) {
  const { results } = await db
    .prepare(
      `SELECT id, name, tier, months, days, price, order_limit, is_active
       FROM plans
       WHERE (? = 1 OR is_active = 1)
       ORDER BY CASE tier WHEN 'Silver' THEN 1 WHEN 'Golden' THEN 2 WHEN 'Diamond' THEN 3 ELSE 0 END, months`
    )
    .bind(isAdmin ? 1 : 0)
    .all<PlanRow>();

  return (results ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    tier: p.tier,
    months: p.months,
    days: p.days,
    price: p.price,
    orderLimit: p.order_limit,
    isActive: p.is_active === 1,
  }));
}

export async function getPlans(request: NextRequest): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin", "owner", "manager", "staff"]);
  if (!guard.ok) return guard.response;

  // Admin ko inactive plans bhi dikhte hain (plans page), baaki roles ko sirf active
  const plans = await loadPlans(getCentreDb(), guard.user.role === "admin");
  return NextResponse.json({ plans });
}

export async function updatePlans(request: NextRequest): Promise<NextResponse> {
  const guard = await requireRole(request, ["admin"]);
  if (!guard.ok) return guard.response;

  const raw = await request.json().catch(() => null);
  const parsed = updatePlansSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: z.flattenError(parsed.error) },
      { status: 400 }
    );
  }

  const { prices, limits } = parsed.data;
  const db = getCentreDb();
  const priceEntries = Object.entries(prices ?? {});

  // Ids verify karo, aur Free Trial ka price badalne se roko
  if (priceEntries.length > 0) {
    const existing = await db.prepare("SELECT id, tier FROM plans").all<{ id: string; tier: string | null }>();
    const rows = existing.results ?? [];
    const validIds = new Set(rows.map((r) => r.id));

    const unknownIds = priceEntries.map(([planId]) => planId).filter((planId) => !validIds.has(planId));
    if (unknownIds.length > 0) {
      return NextResponse.json({ error: `Unknown plan id(s): ${unknownIds.join(", ")}` }, { status: 400 });
    }

    // Free Trial ki tier khali hoti hai, uska price hamesha 0 rahega
    const trialIds = new Set(rows.filter((r) => r.tier === null).map((r) => r.id));
    if (priceEntries.some(([planId]) => trialIds.has(planId))) {
      return NextResponse.json({ error: "Free Trial plan price cannot be changed" }, { status: 400 });
    }
  }

  // Fixed SQL, sirf values bind hoti hain
  const statements: D1PreparedStatement[] = [];

  for (const [planId, nextPrice] of priceEntries) {
    statements.push(db.prepare("UPDATE plans SET price = ? WHERE id = ?").bind(nextPrice, planId));
  }
  if (limits?.Silver !== undefined) {
    statements.push(db.prepare("UPDATE plans SET order_limit = ? WHERE tier = 'Silver'").bind(limits.Silver));
  }
  if (limits?.Golden !== undefined) {
    statements.push(db.prepare("UPDATE plans SET order_limit = ? WHERE tier = 'Golden'").bind(limits.Golden));
  }
  if (limits?.Diamond !== undefined) {
    statements.push(db.prepare("UPDATE plans SET order_limit = ? WHERE tier = 'Diamond'").bind(limits.Diamond));
  }

  // Sab ek saath: ya sab badlega, ya kuch nahi
  await db.batch(statements);

  return NextResponse.json({ plans: await loadPlans(db, true) });
}