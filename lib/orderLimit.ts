"use client";

import { store } from "./redux-store";
import { orderLimitStatus, type OrderLimitStatus } from "./plans";
import type { Order } from "./orders";

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** How many of the plan's monthly orders this centre has used. `null` when the centre is not found. Cancelled orders are not counted. */
export function tenantOrderLimit(tenantId: string, orders: Order[]): OrderLimitStatus | null {
  const tenant = store.getState().tenants.find((t) => t.id === tenantId);
  if (!tenant) return null;
  return orderLimitStatus(tenant.plan, tenant.subscriptionExpiresAt, orders, tenant.id);
}

/**
 * A message when the centre cannot take another order because its plan limit is used up, otherwise `null`.
 * Call it before createOrder. `audience` decides the wording: the customer is told to try later, the centre is told to upgrade.
 */
export function orderLimitBlock(tenantId: string, orders: Order[], audience: "customer" | "centre" = "customer"): string | null {
  const status = tenantOrderLimit(tenantId, orders);
  if (!status || !status.reached) return null;
  return audience === "customer"
    ? `This centre is not taking new orders right now. Please try again after ${fmtDate(status.resetsOn)} or call the centre.`
    : `You have used all ${status.limit} orders of this month. New orders open again on ${fmtDate(status.resetsOn)}, or upgrade your plan to take more now.`;
}