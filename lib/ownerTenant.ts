"use client";

import { useEffect, useState } from "react";
import { restoreStaff, restoreTenants, store, useAppSelector, type Tenant } from "./redux-store";

const OWNER_TENANT_KEY = "vehicle-service-tenant";
const DAY = 24 * 60 * 60 * 1000;

export const TRIAL_DAYS = 14;
/** Demo fallback so the owner workspace still opens when the login doesn't match a created tenant. */
const DEMO_TENANT_ID = "TEN001";

export function saveOwnerTenantId(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(OWNER_TENANT_KEY, id);
}
export function getOwnerTenantId(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(OWNER_TENANT_KEY);
}
export function clearOwnerTenantId() {
  if (typeof window !== "undefined") localStorage.removeItem(OWNER_TENANT_KEY);
}

/** Finds the tenant whose owner mobile/email matches the login identifier (demo, no backend yet). */
export function resolveOwnerTenantId(identifier: string): string {
  restoreTenants();
  const id = identifier.trim().toLowerCase();
  const match = store.getState().tenants.find((t) => t.mobile === id || t.email?.toLowerCase() === id);
  return match?.id ?? DEMO_TENANT_ID;
}

const BLOCKED_USERS_KEY = "vehicle-service-platform.blockedUsers";

/**
 * Manager login: finds the manager the owner added (by mobile/email) and the tenant they work for.
 * Suspended or admin-blocked managers cannot sign in. Unknown logins fall back to the demo tenant.
 */
export function resolveManagerLogin(identifier: string): { tenantId: string; error?: undefined } | { error: string; tenantId?: undefined } {
  restoreTenants();
  restoreStaff();
  const id = identifier.trim().toLowerCase();
  const member = store.getState().staff.find((m) => m.mobile === id || m.email?.toLowerCase() === id);
  if (!member) return { tenantId: DEMO_TENANT_ID };
  if (member.role !== "Manager") return { error: "This number is registered as a driver. Drivers don't have a web workspace." };
  let blocked: string[] = [];
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(BLOCKED_USERS_KEY) ?? "[]");
    if (Array.isArray(saved)) blocked = saved as string[];
  } catch {}
  if (blocked.includes(member.id)) return { error: "This account has been blocked. Please contact AutoServe support." };
  if (member.status === "Suspended") return { error: "Your account is suspended. Please contact your service centre owner." };
  return { tenantId: member.tenantId };
}

export type OwnerSubscription = {
  tenant: Tenant;
  isTrial: boolean;
  /** Whole days left, 0 on the last day. Negative once expired. */
  daysLeft: number;
  expired: boolean;
  suspended: boolean;
  /** Owner may use the workspace only when not suspended and not expired. */
  locked: boolean;
};

export function describeSubscription(tenant: Tenant): OwnerSubscription {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((new Date(`${tenant.subscriptionExpiresAt}T00:00:00`).getTime() - today.getTime()) / DAY);
  const expired = daysLeft < 0;
  const suspended = tenant.status === "Suspended";
  return { tenant, isTrial: tenant.plan === "Free Trial", daysLeft, expired, suspended, locked: expired || suspended };
}

/** Subscription of the tenant the signed-in owner belongs to. `null` until loaded. */
export function useOwnerSubscription(): OwnerSubscription | null {
  const tenants = useAppSelector((s) => s.tenants);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    restoreTenants();
    setTenantId(getOwnerTenantId() ?? DEMO_TENANT_ID);
  }, []);

  const tenant = tenants.find((t) => t.id === tenantId);
  return tenant ? describeSubscription(tenant) : null;
}
/** Staff login: only a staff member the owner/manager added can sign in. Suspended or blocked staff cannot. */
export function resolveStaffLogin(identifier: string): { tenantId: string; error?: undefined } | { error: string; tenantId?: undefined } {
  restoreTenants();
  restoreStaff();
  const id = identifier.trim().toLowerCase();
  const member = store.getState().staff.find((m) => m.mobile === id || m.email?.toLowerCase() === id);
  if (!member || member.role !== "Driver") {
    return { error: "No staff account found. Ask your service centre to add you from My Staff." };
  }
  let blocked: string[] = [];
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(BLOCKED_USERS_KEY) ?? "[]");
    if (Array.isArray(saved)) blocked = saved as string[];
  } catch {}
  if (blocked.includes(member.id)) return { error: "This account has been blocked. Please contact AutoServe support." };
  if (member.status === "Suspended") return { error: "Your account is suspended. Please contact your service centre." };
  return { tenantId: member.tenantId };
}