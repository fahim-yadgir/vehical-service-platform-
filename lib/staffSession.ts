"use client";

import { useEffect, useState } from "react";
import { getSessionAccount } from "./tenantAccounts";
import { restoreStaff, restoreTenants, useAppSelector } from "./redux-store";
import { isClosed, restoreOrders, useOrders } from "./orders";

/** The signed-in staff member, their service centre and ONLY the orders assigned to them. */
export function useStaffWorkspace() {
  const allStaff = useAppSelector((s) => s.staff);
  const tenants = useAppSelector((s) => s.tenants);
  const allOrders = useOrders();
  const [mobile, setMobile] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    restoreOrders();
    setMobile(getSessionAccount()?.mobile ?? null);
    setReady(true);
  }, []);

  const me = mobile ? allStaff.find((m) => m.mobile === mobile && m.role === "staff") : undefined;
  const tenant = me ? tenants.find((t) => t.id === me.tenantId) : undefined;

  // the filter that keeps every other order hidden from this person
  const orders = me ? allOrders.filter((o) => o.assignedStaffId === me.id && o.tenantId === me.tenantId) : [];
  const open = orders.filter((o) => !isClosed(o.status));
  const completed = orders.filter((o) => o.status === "completed");
  const cancelled = orders.filter((o) => o.status === "cancelled");

  return { ready, me, tenant, orders, open, completed, cancelled };
}