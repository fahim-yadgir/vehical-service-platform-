"use client";

import { useCallback, useEffect, useState } from "react";

export type PlanDef = { name: string; months: number; days: number };

/** The plans the platform sells. The admin sets the price of each paid plan on the Plans page. */
export const plans: PlanDef[] = [
  { name: "Free Trial", months: 0, days: 14 },
  { name: "1 Month", months: 1, days: 0 },
  { name: "3 Months", months: 3, days: 0 },
  { name: "6 Months", months: 6, days: 0 },
  { name: "1 Year", months: 12, days: 0 },
];
export const planNames = plans.map((p) => p.name);
export const paidPlans = plans.filter((p) => p.months > 0);

const KEY = "vehicle-service-platform.plan-prices";
export type PlanPrices = Record<string, number>;

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

/** Price of a plan in rupees. 0 until the admin sets it. The free trial is always 0. */
export function planPriceOf(name: string, prices: PlanPrices = loadPlanPrices()): number {
  const plan = plans.find((p) => p.name === name);
  if (!plan || plan.months === 0) return 0;
  const value = prices[name];
  return typeof value === "number" && value > 0 ? value : 0;
}

export const planMonthsOf = (name: string) => plans.find((p) => p.name === name)?.months || 1;

const pad = (n: number) => String(n).padStart(2, "0");

/** Expiry date (yyyy-mm-dd) of a plan that starts on `start`. Month ends are kept (31 Jan + 1 month = 28/29 Feb). */
export function planExpiry(name: string, start: Date): string {
  const plan = plans.find((p) => p.name === name);
  const months = plan?.months ?? 0;
  const days = plan?.days ?? 0;
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const end = new Date(target.getFullYear(), target.getMonth(), Math.min(start.getDate(), lastDay) + days);
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
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