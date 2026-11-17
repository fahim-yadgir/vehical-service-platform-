"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export type PlanDef = {
  name: string;
  months: number;
  days: number;
  tier?: string;
};

export const TRIAL_PLAN = "Free Trial";

export const TIERS = [
  "Silver",
  "Golden",
  "Diamond",
];

export const DURATIONS = [
  { months: 1, label: "1 Month" },
  { months: 3, label: "3 Months" },
  { months: 6, label: "6 Months" },
  { months: 12, label: "1 Year" },
];

export const plans: PlanDef[] = [
  {
    name: TRIAL_PLAN,
    months: 0,
    days: 14,
  },

  ...TIERS.flatMap((tier) =>
    DURATIONS.map((duration) => ({
      name: `${tier} ${duration.label}`,
      months: duration.months,
      days: 0,
      tier,
    })),
  ),
];

export const planNames = plans.map((plan) => plan.name);

export const paidPlans = plans.filter(
  (plan) => plan.months > 0,
);

export const plansOfTier = (tier: string) =>
  plans.filter((plan) => plan.tier === tier);

const LEGACY_PLANS: PlanDef[] = [
  {
    name: "Silver",
    months: 1,
    days: 0,
    tier: "Silver",
  },
  {
    name: "Golden",
    months: 1,
    days: 0,
    tier: "Golden",
  },
  {
    name: "Diamond",
    months: 1,
    days: 0,
    tier: "Diamond",
  },
  {
    name: "1 Month",
    months: 1,
    days: 0,
  },
  {
    name: "3 Months",
    months: 3,
    days: 0,
  },
  {
    name: "6 Months",
    months: 6,
    days: 0,
  },
  {
    name: "1 Year",
    months: 12,
    days: 0,
  },
];

const findPlan = (name: string) =>
  plans.find((plan) => plan.name === name) ??
  LEGACY_PLANS.find((plan) => plan.name === name);

export const planTierOf = (name: string) =>
  findPlan(name)?.tier;

const KEY = "vehicle-service-platform.plan-prices";

const LIMIT_KEY = "vehicle-service-platform.plan-limits";

export type PlanPrices = Record<string, number>;

export type PlanLimits = Record<string, number>;

export const DEFAULT_PLAN_LIMITS: PlanLimits = {
  Silver: 20,
  Golden: 40,
  Diamond: 60,
};

export function loadPlanPrices(): PlanPrices {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(KEY) ?? "{}",
    );

    return raw && typeof raw === "object"
      ? (raw as PlanPrices)
      : {};
  } catch {
    return {};
  }
}

export function savePlanPrices(prices: PlanPrices) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(prices),
    );
  } catch {}
}

export function loadPlanLimits(): PlanLimits {
  try {
    const stored = window.localStorage.getItem(LIMIT_KEY);

    if (stored === null) {
      return { ...DEFAULT_PLAN_LIMITS };
    }

    const raw: unknown = JSON.parse(stored);

    return raw && typeof raw === "object"
      ? (raw as PlanLimits)
      : { ...DEFAULT_PLAN_LIMITS };
  } catch {
    return { ...DEFAULT_PLAN_LIMITS };
  }
}

export function savePlanLimits(limits: PlanLimits) {
  try {
    window.localStorage.setItem(
      LIMIT_KEY,
      JSON.stringify(limits),
    );
  } catch {}
}

export function planPriceOf(
  name: string,
  prices: PlanPrices = loadPlanPrices(),
): number {
  const plan = findPlan(name);

  if (!plan || plan.months === 0) {
    return 0;
  }

  const value = prices[name];

  return typeof value === "number" && value > 0
    ? value
    : 0;
}

export function planLimitOf(
  name: string,
  limits: PlanLimits = loadPlanLimits(),
): number {
  const key = findPlan(name)?.tier ?? name;

  const value = limits[key];

  return typeof value === "number" && value > 0
    ? value
    : 0;
}

export const planMonthsOf = (name: string) =>
  findPlan(name)?.months || 1;

const pad = (number: number) =>
  String(number).padStart(2, "0");

export function planExpiry(
  name: string,
  start: Date,
): string {
  const plan = findPlan(name);

  const months = plan?.months ?? 0;
  const days = plan?.days ?? 0;

  const target = new Date(
    start.getFullYear(),
    start.getMonth() + months,
    1,
  );

  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();

  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(start.getDate(), lastDay) + days,
  );

  return `${end.getFullYear()}-${pad(
    end.getMonth() + 1,
  )}-${pad(end.getDate())}`;
}

// ---- monthly order limit ----

type OrderLike = {
  tenantId?: string;
  status: string;
  createdBy: {
    at: string;
  };
};

const parseDay = (date: string) => {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
  );
};

function addMonths(base: Date, count: number) {
  const target = new Date(
    base.getFullYear(),
    base.getMonth() + count,
    1,
  );

  const last = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();

  return new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(base.getDate(), last),
  );
}

export function planWindow(
  planName: string,
  expiresAt: string,
  now: Date = new Date(),
): {
  start: Date;
  end: Date;
} {
  const plan = findPlan(planName);

  const expiry = parseDay(expiresAt);

  if (!plan || plan.months === 0) {
    const days = plan?.days ?? 0;

    return {
      start: new Date(
        expiry.getFullYear(),
        expiry.getMonth(),
        expiry.getDate() - days,
      ),

      end: new Date(
        expiry.getFullYear(),
        expiry.getMonth(),
        expiry.getDate() + 1,
      ),
    };
  }

  const start = addMonths(expiry, -plan.months);

  let index = 0;

  while (
    index < plan.months - 1 &&
    addMonths(start, index + 1) <= now
  ) {
    index++;
  }

  return {
    start: addMonths(start, index),
    end: addMonths(start, index + 1),
  };
}

export type OrderLimitStatus = {
  limit: number;
  used: number;
  reached: boolean;
  resetsOn: Date;
};

export function orderLimitStatus(
  planName: string,
  expiresAt: string,
  orders: OrderLike[],
  tenantId: string,
  limits: PlanLimits = loadPlanLimits(),
  now: Date = new Date(),
): OrderLimitStatus {
  const limit = planLimitOf(planName, limits);

  const { start, end } = planWindow(
    planName,
    expiresAt,
    now,
  );

  // Requested and accepted bookings count.
  // Rejected and cancelled bookings do not count.
  const used = orders.filter((order) => {
    if (
      order.tenantId !== tenantId ||
      order.status === "cancelled" ||
      order.status === "rejected"
    ) {
      return false;
    }

    const at = new Date(order.createdBy.at);

    return at >= start && at < end;
  }).length;

  return {
    limit,
    used,
    reached: limit > 0 && used >= limit,
    resetsOn: end,
  };
}

// ---- plan prices hook ----

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

  return {
    prices,
    loaded,
    save,
  };
}

// ---- plan limits hook ----

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

  return {
    limits,
    loaded,
    save,
  };
}