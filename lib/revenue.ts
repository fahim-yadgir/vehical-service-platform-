import type { Tenant } from "./redux-store";

/** Platform revenue = subscription payments made by tenants. */
export type Payment = {
  id: string;
  tenantId: string;
  tenant: string;
  plan: string;
  amount: number;
  date: string;
};

export type Preset =
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisFY"
  | "lastFY"
  | "custom";

export type Range = {
  from: string;
  to: string;
};

export const planPrice: Record<string, number> = {
  "Free Trial": 0,
  "1 Month": 2999,
  "6 Months": 14999,
  "1 Year": 26999,
};

const planMonths: Record<string, number> = {
  "1 Month": 1,
  "6 Months": 6,
  "1 Year": 12,
};

const DAY = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * All dates are plain "yyyy-mm-dd" strings in local time,
 * so they compare correctly as text.
 */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addMonths = (s: string, n: number) => {
  const d = parse(s);
  const day = d.getDate();

  d.setDate(1);
  d.setMonth(d.getMonth() + n);

  d.setDate(
    Math.min(
      day,
      new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0
      ).getDate()
    )
  );

  return ymd(d);
};

export const formatINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export const formatINRShort = (n: number) =>
  n >= 10000000
    ? `₹${+(n / 10000000).toFixed(1)}Cr`
    : n >= 100000
      ? `₹${+(n / 100000).toFixed(1)}L`
      : n >= 1000
        ? `₹${+(n / 1000).toFixed(1)}k`
        : `₹${n}`;

export const formatDate = (s: string) =>
  parse(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * One payment at sign-up and one at every renewal,
 * until the subscription end date or today.
 */
export function buildPayments(
  tenants: Tenant[],
  today: string
): Payment[] {
  const out: Payment[] = [];

  tenants.forEach((t) => {
    const price = planPrice[t.plan] ?? 0;

    // Free trial: nothing is billed.
    if (price === 0) return;

    const step = planMonths[t.plan] ?? 1;

    for (let k = 0; k < 120; k++) {
      const date = addMonths(t.createdAt, k * step);

      if (
        date > today ||
        date >= t.subscriptionExpiresAt
      ) {
        break;
      }

      out.push({
        id: `INV-${date
          .slice(0, 7)
          .replace("-", "")}-${t.id.replace(/\D/g, "")}${k}`,
        tenantId: t.id,
        tenant: t.name,
        plan: t.plan,
        amount: price,
        date,
      });
    }
  });

  return out.sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
}

/**
 * Indian financial year:
 * 1 Apr to 31 Mar.
 */
export function presetRange(
  preset: Exclude<Preset, "custom">,
  today: string
): Range {
  const t = parse(today);
  const y = t.getFullYear();
  const m = t.getMonth();

  // Current calendar month
  if (preset === "thisMonth") {
    return {
      from: ymd(new Date(y, m, 1)),
      to: ymd(new Date(y, m + 1, 0)),
    };
  }

  // Previous calendar month
  if (preset === "lastMonth") {
    return {
      from: ymd(new Date(y, m - 1, 1)),
      to: ymd(new Date(y, m, 0)),
    };
  }

  // Last 3 calendar months including the current month
  if (preset === "last3Months") {
    return {
      from: ymd(new Date(y, m - 2, 1)),
      to: ymd(new Date(y, m + 1, 0)),
    };
  }

  // Indian financial year
  const fy = m >= 3 ? y : y - 1;

  const start = preset === "thisFY" ? fy : fy - 1;

  return {
    from: `${start}-04-01`,
    to: `${start + 1}-03-31`,
  };
}

export const inRange = (
  payments: Payment[],
  r: Range
) =>
  payments.filter(
    (p) => p.date >= r.from && p.date <= r.to
  );

export const total = (payments: Payment[]) =>
  payments.reduce(
    (sum, p) => sum + p.amount,
    0
  );

/**
 * What to compare against:
 *
 * - This month → previous month
 * - Last month → month before last month
 * - Last 3 months → previous 3-month period
 * - This FY → previous FY
 * - Last FY → FY before that
 * - Custom → previous period of the same length
 */
export function previousRange(
  r: Range,
  today: string,
  preset: Preset
): Range {
  const f = parse(r.from);

  // Calendar month comparisons
  if (
    preset === "thisMonth" ||
    preset === "lastMonth"
  ) {
    return {
      from: ymd(
        new Date(
          f.getFullYear(),
          f.getMonth() - 1,
          1
        )
      ),
      to: ymd(
        new Date(
          f.getFullYear(),
          f.getMonth(),
          0
        )
      ),
    };
  }

  // Last 3 months comparison
  if (preset === "last3Months") {
    const previousFrom = new Date(
      f.getFullYear(),
      f.getMonth() - 3,
      1
    );

    const previousTo = new Date(
      f.getFullYear(),
      f.getMonth(),
      0
    );

    return {
      from: ymd(previousFrom),
      to: ymd(previousTo),
    };
  }

  // Financial year comparisons
  if (
    preset === "thisFY" ||
    preset === "lastFY"
  ) {
    return {
      from: `${f.getFullYear() - 1}-04-01`,
      to: `${f.getFullYear()}-03-31`,
    };
  }

  // Custom range comparison
  const end = r.to < today ? r.to : today;

  const days =
    Math.max(
      1,
      Math.round(
        (parse(end).getTime() - f.getTime()) /
          DAY
      ) + 1
    );

  const prevTo = new Date(
    f.getTime() - DAY
  );

  const prevFrom = new Date(
    prevTo.getTime() -
      (days - 1) * DAY
  );

  return {
    from: ymd(prevFrom),
    to: ymd(prevTo),
  };
}

/**
 * Revenue per calendar month inside the range.
 * Stops at today.
 */
export function monthlyTotals(
  payments: Payment[],
  r: Range,
  today: string
) {
  const end = parse(
    r.to < today ? r.to : today
  );

  const startDate = parse(r.from);

  const cursor = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    1
  );

  const rows: {
    label: string;
    amount: number;
  }[] = [];

  while (
    cursor <= end &&
    rows.length < 60
  ) {
    const key = ymd(cursor).slice(0, 7);

    rows.push({
      label: cursor.toLocaleDateString(
        "en-IN",
        {
          month: "short",
          year: "2-digit",
        }
      ),

      amount: total(
        inRange(payments, r).filter(
          (p) =>
            p.date.slice(0, 7) === key
        )
      ),
    });

    cursor.setMonth(
      cursor.getMonth() + 1
    );
  }

  return rows;
}