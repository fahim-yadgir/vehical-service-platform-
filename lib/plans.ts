"use client";

import { useCallback, useEffect, useState } from "react";

export type PlanDef = { name: string; months: number; days: number; tier?: string };

export const TRIAL_PLAN = "Free Trial";
/** The plan types. Each one is sold for every duration below. */
export const TIERS = ["Silver", "Golden", "Diamond"];
export const DURATIONS = [
  { months: 1, label: "1 Month" },
  { months: 3, label: "3 Months" },
  { months: 6, label: "6 Months" },
  { months: 12, label: "1 Year" },
];

/** The plans the platform sells: "Silver 1 Month", "Silver 3 Months" ... for every tier. The admin sets the price of each on the Plans page. */
export const plans: PlanDef[] = [
  { name: TRIAL_PLAN, months: 0, days: 14 },
  ...TIERS.flatMap((tier) =>
    DURATIONS.map((d) => ({ name: `${tier} ${d.label}`, months: d.months, days: 0, tier })),
  ),
];
export const planNames = plans.map((p) => p.name);
export const paidPlans = plans.filter((p) => p.months > 0);
/** The plans of one tier, shortest duration first. */
export const plansOfTier = (tier: string) => plans.filter((p) => p.tier === tier);

/** Plan names used before tiers had durations. Tenants already on them keep working, but they are not sold any more. */
const LEGACY_PLANS: PlanDef[] = [
  { name: "Silver", months: 1, days: 0, tier: "Silver" },
  { name: "Golden", months: 1, days: 0, tier: "Golden" },
  { name: "Diamond", months: 1, days: 0, tier: "Diamond" },
  { name: "1 Month", months: 1, days: 0 },
  { name: "3 Months", months: 3, days: 0 },
  { name: "6 Months", months: 6, days: 0 },
  { name: "1 Year", months: 12, days: 0 },
];

const findPlan = (name: string) => plans.find((p) => p.name === name) ?? LEGACY_PLANS.find((p) => p.name === name);

/** "Silver" for "Silver 3 Months". undefined for the free trial and the old plain duration plans. */
export const planTierOf = (name: string) => findPlan(name)?.tier;

const KEY = "vehicle-service-platform.plan-prices";
const LIMIT_KEY = "vehicle-service-platform.plan-limits";
export type PlanPrices = Record<string, number>;
/** Orders allowed per month. Keyed by tier ("Silver") or by "Free Trial". 0 (or missing) = unlimited. */
export type PlanLimits = Record<string, number>;

/** Starting values only, used until the super admin saves their own limits on the Plans page. */
export const DEFAULT_PLAN_LIMITS: PlanLimits = { Silver: 20, Golden: 40, Diamond: 60 };

export function loadPlanPrices(): PlanPrices {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" ? (raw as PlanPrices) : {};
  } catch {
    return {};
  }
}

export function savePlanPrices(prices: PlanPrices) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prices));
  } catch {}
}

export function loadPlanLimits(): PlanLimits {
  try {
    const stored = window.localStorage.getItem(LIMIT_KEY);
    if (stored === null) return { ...DEFAULT_PLAN_LIMITS };
    const raw: unknown = JSON.parse(stored);
    return raw && typeof raw === "object" ? (raw as PlanLimits) : { ...DEFAULT_PLAN_LIMITS };
  } catch {
    return { ...DEFAULT_PLAN_LIMITS };
  }
}

export function savePlanLimits(limits: PlanLimits) {
  try {
    window.localStorage.setItem(LIMIT_KEY, JSON.stringify(limits));
  } catch {}
}

/** Price of a plan in rupees. 0 until the admin sets it. The free trial is always 0. */
export function planPriceOf(name: string, prices: PlanPrices = loadPlanPrices()): number {
  const plan = findPlan(name);
  if (!plan || plan.months === 0) return 0;
  const value = prices[name];
  return typeof value === "number" && value > 0 ? value : 0;
}

/** Orders per month a plan allows, as set by the super admin. One limit per tier: every duration of Silver shares it. 0 = unlimited. */
export function planLimitOf(name: string, limits: PlanLimits = loadPlanLimits()): number {
  const key = findPlan(name)?.tier ?? name;
  const value = limits[key];
  return typeof value === "number" && value > 0 ? value : 0;
}

export const planMonthsOf = (name: string) => findPlan(name)?.months || 1;

const pad = (n: number) => String(n).padStart(2, "0");

/** Expiry date (yyyy-mm-dd) of a plan that starts on `start`. Month ends are kept (31 Jan + 1 month = 28/29 Feb). */
export function planExpiry(name: string, start: Date): string {
  const plan = findPlan(name);
  const months = plan?.months ?? 0;
  const days = plan?.days ?? 0;
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const end = new Date(target.getFullYear(), target.getMonth(), Math.min(start.getDate(), lastDay) + days);
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
}

// ---- monthly order limit ----

/** The fields of an order that the limit needs. Order from lib/orders.ts fits this. */
type OrderLike = { tenantId?: string; status: string; createdBy: { at: string } };

const parseDay = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
};

/** `base` moved by `n` months, keeping month ends (31 Jan + 1 month = 28/29 Feb). */
function addMonths(base: Date, n: number) {
  const target = new Date(base.getFullYear(), base.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(base.getDate(), last));
}

/**
 * The current limit window of a tenant: one month counted from the day the plan started (expiry minus the plan's
 * length), not the calendar month. A 3 month plan has three windows, each with its own full limit.
 * The free trial is a single window.
 */
export function planWindow(planName: string, expiresAt: string, now: Date = new Date()): { start: Date; end: Date } {
  const plan = findPlan(planName);
  const exp = parseDay(expiresAt);
  if (!plan || plan.months === 0) {
    const days = plan?.days ?? 0;
    return {
      start: new Date(exp.getFullYear(), exp.getMonth(), exp.getDate() - days),
      end: new Date(exp.getFullYear(), exp.getMonth(), exp.getDate() + 1),
    };
  }
  const start = addMonths(exp, -plan.months);
  let k = 0;
  while (k < plan.months - 1 && addMonths(start, k + 1) <= now) k++;
  return { start: addMonths(start, k), end: addMonths(start, k + 1) };
}

export type OrderLimitStatus = {
  /** Orders allowed in the window. 0 = unlimited. */
  limit: number;
  /** Orders counted so far in this window. Cancelled orders are not counted. */
  used: number;
  reached: boolean;
  /** When the count starts again from zero. */
  resetsOn: Date;
};

/** How many of the plan's monthly orders a centre has used. Only the centre's own orders count (not the demo seed orders). */
export function orderLimitStatus(
  planName: string,
  expiresAt: string,
  orders: OrderLike[],
  tenantId: string,
  limits: PlanLimits = loadPlanLimits(),
  now: Date = new Date(),
): OrderLimitStatus {
  const limit = planLimitOf(planName, limits);
  const { start, end } = planWindow(planName, expiresAt, now);
  const used = orders.filter((o) => {
    if (o.tenantId !== tenantId || o.status === "cancelled") return false;
    const at = new Date(o.createdBy.at);
    return at >= start && at < end;
  }).length;
  return { limit, used, reached: limit > 0 && used >= limit, resetsOn: end };
}

/** Prices for pages. `loaded` is false until localStorage has been read. */
export function usePlanPrices() {
  const [prices, setPrices] = useState<PlanPrices>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrices(loadPlanPrices());
    setLoaded(true);
  }, []);

  const save = useCallback((next: PlanPrices) => {
    savePlanPrices(next);
    setPrices(next);
  }, []);

  return { prices, loaded, save };
}

/** Monthly order limits for pages. `loaded` is false until localStorage has been read. */
export function usePlanLimits() {
  const [limits, setLimits] = useState<PlanLimits>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLimits(loadPlanLimits());
    setLoaded(true);
  }, []);

  const save = useCallback((next: PlanLimits) => {
    savePlanLimits(next);
    setLimits(next);
  }, []);

  return { limits, loaded, save };
}