"use client";

import { loadAccounts } from "./tenantAccounts";
import { restoreStaff, restoreTenants, store } from "./redux-store";

/** A mobile number can belong to only one account on the whole platform (owner, staff or customer). */
export function isMobileRegistered(mobile: string) {
  restoreTenants();
  restoreStaff();
  const { tenants, staff } = store.getState();
  return tenants.some((t) => t.mobile === mobile) || staff.some((m) => m.mobile === mobile) || loadAccounts().some((a) => a.mobile === mobile);
}