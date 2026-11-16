"use client";

import { store } from "./redux-store";
import { removeAccount, updateAccountProfile } from "./tenantAccounts";
import type { PlatformUser } from "./mockUsers";

/** Same key the login checks (customerUserId for customers, the staff id for managers and staff). */
export const BLOCKED_KEY = "vehicle-service-platform.blockedUsers";

export function loadBlocked(): string[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(BLOCKED_KEY) ?? "[]");
    return Array.isArray(saved) ? (saved as string[]) : [];
  } catch {
    return [];
  }
}

export function saveBlocked(ids: string[]) {
  try {
    window.localStorage.setItem(BLOCKED_KEY, JSON.stringify(ids));
  } catch {}
}

/** An owner has the id "<tenantId>-OWN". */
export const ownerTenantId = (u: PlatformUser) => u.id.replace(/-OWN$/, "");

/** Saves the new name and email where this kind of user is really stored, and on their login. The mobile never changes. */
export function updateUserDetails(u: PlatformUser, changes: { name: string; email?: string }) {
  const { name, email } = changes;
  if (u.role === "Owner") {
    const tenant = store.getState().tenants.find((t) => t.id === ownerTenantId(u));
    if (tenant) store.dispatch({ type: "tenants/updated", payload: { ...tenant, owner: name, email } });
  } else if (u.role !== "Customer") {
    const member = store.getState().staff.find((m) => m.id === u.id);
    if (member) store.dispatch({ type: "staff/updated", payload: { ...member, name, email } });
  }
  if (u.mobile !== "–") updateAccountProfile(u.mobile, { name, email });
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Deletes a customer, manager or staff member and their login. Owners are removed by deleting the tenant. */
export function deleteUser(u: PlatformUser): DeleteResult {
  if (u.role === "Owner") {
    return {
      ok: false,
      error: `${u.name} is the owner of ${u.tenant}. To remove an owner, delete the whole service centre from the Tenants page.`,
    };
  }
  if (u.role !== "Customer") store.dispatch({ type: "staff/deleted", payload: u.id });
  if (u.mobile !== "–") removeAccount(u.mobile);
  saveBlocked(loadBlocked().filter((id) => id !== u.id));
  return { ok: true };
}