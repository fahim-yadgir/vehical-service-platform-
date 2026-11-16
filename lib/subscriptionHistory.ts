import { formatDate, formatINR } from "./revenue";
import { planPriceOf } from "./plans";
import type { SubscriptionRecord, Tenant } from "./redux-store";

export const FREE_TRIAL = "Free Trial";

export function newSubscriptionRecord(input: Omit<SubscriptionRecord, "id">): SubscriptionRecord {
  return { id: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...input };
}

/**
 * Every plan the tenant has taken, newest first.
 * Tenants created before the history existed have nothing saved, so one entry is built from their current plan.
 */
export function tenantHistory(t: Tenant): SubscriptionRecord[] {
  const saved = t.subscriptionHistory ?? [];
  const list: SubscriptionRecord[] = saved.length
    ? saved
    : [
        {
          id: `legacy-${t.id}`,
          plan: t.plan,
          amount: planPriceOf(t.plan),
          payDate: t.createdAt,
          startsOn: t.createdAt,
          endsOn: t.subscriptionExpiresAt,
        },
      ];
  return [...list].sort((a, b) => {
    if (a.startsOn !== b.startsOn) return a.startsOn < b.startsOn ? 1 : -1;
    if (a.payDate !== b.payDate) return a.payDate < b.payDate ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

/** The most recent subscription (what the Tenants table shows as Pay date and Amount). */
export const latestRecord = (t: Tenant) => tenantHistory(t)[0];

export const payDateLabel = (r: SubscriptionRecord) => (r.plan === FREE_TRIAL ? "—" : formatDate(r.payDate));

export const amountLabel = (r: SubscriptionRecord) =>
  r.plan === FREE_TRIAL ? "Free" : r.amount > 0 ? formatINR(r.amount) : "Not set";

/** "Active" while today is inside the period, "Upcoming" before it starts, "Ended" after it. `today` is yyyy-mm-dd. */
export function recordStatus(r: SubscriptionRecord, today: string): "Active" | "Upcoming" | "Ended" {
  if (today > r.endsOn) return "Ended";
  if (today < r.startsOn) return "Upcoming";
  return "Active";
}