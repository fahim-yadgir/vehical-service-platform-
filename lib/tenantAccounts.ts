"use client";

/**
 * DEMO ONLY. Logins of tenant staff (owner, later manager/drivers) kept in this browser so the
 * "temporary password -> forced change" flow can be tried without a backend.
 * The real backend must hash passwords (bcrypt/argon2) and never trust the browser.
 */
/** "staff" does pickup and delivery. "customer" registers on the public side and has no tenant. */
export type AccountRole = "owner" | "manager" | "staff" | "customer";

export type TenantAccount = {
  mobile: string;
  email?: string;
  name: string;
  role: AccountRole;
  tenantId: string;
  hash: string;
  mustChangePassword: boolean;
  createdAt?: string;
};

const ACCOUNTS_KEY = "vehicle-service-platform.accounts";
const SESSION_KEY = "vehicle-service-account";

async function hashPassword(mobile: string, password: string) {
  const text = `${mobile}:${password}`;
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // crypto.subtle needs https or localhost; this keeps the demo working on a LAN address too.
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return `demo-${h}`;
  }
}

export function loadAccounts(): TenantAccount[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
    // accounts saved before the staff rename used the role "driver"
    return Array.isArray(saved) ? saved.map((a) => (a.role === "driver" ? { ...a, role: "staff" } : a)) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: TenantAccount[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

/** Creates (or replaces) the login for a mobile number. Staff and owners start with a temporary password; customers choose their own. */
export async function createAccount(a: Omit<TenantAccount, "hash" | "mustChangePassword"> & { password: string; mustChangePassword?: boolean }) {
  const { password, mustChangePassword = true, ...rest } = a;
  const account: TenantAccount = {
    ...rest,
    createdAt: rest.createdAt ?? new Date().toISOString().slice(0, 10),
    hash: await hashPassword(a.mobile, password),
    mustChangePassword,
  };
  saveAccounts([...loadAccounts().filter((x) => x.mobile !== a.mobile), account]);
}

export function removeTenantAccounts(tenantId: string) {
  saveAccounts(loadAccounts().filter((x) => x.tenantId !== tenantId));
}

/** Removes one login, e.g. when the owner removes a staff member. */
export function removeAccount(mobile: string) {
  saveAccounts(loadAccounts().filter((x) => x.mobile !== mobile));
}

/** Matches by mobile number or email. */
export function findAccount(identifier: string) {
  const id = identifier.trim().toLowerCase();
  return loadAccounts().find((a) => a.mobile === id || (a.email && a.email.toLowerCase() === id));
}

export async function verifyPassword(account: TenantAccount, password: string) {
  return (await hashPassword(account.mobile, password)) === account.hash;
}

export async function changePassword(mobile: string, newPassword: string) {
  const hash = await hashPassword(mobile, newPassword);
  saveAccounts(loadAccounts().map((a) => (a.mobile === mobile ? { ...a, hash, mustChangePassword: false } : a)));
}

export function saveAccountSession(mobile: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, mobile);
  } catch {}
}

export function clearAccountSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** The tenant account that is logged in right now (undefined for demo logins). */
export function getSessionAccount() {
  try {
    const mobile = window.localStorage.getItem(SESSION_KEY);
    return mobile ? loadAccounts().find((a) => a.mobile === mobile) : undefined;
  } catch {
    return undefined;
  }
}
/** Changes the name and email on one login. The mobile stays: it is the login. */
export function updateAccountProfile(mobile: string, changes: { name: string; email?: string }) {
  saveAccounts(loadAccounts().map((a) => (a.mobile === mobile ? { ...a, ...changes } : a)));
}

const BLOCKED_USERS_KEY = "vehicle-service-platform.blockedUsers";

/** Same id the admin Users page uses, so Block there stops the login here. */
export const customerUserId = (mobile: string) => `CUS-${mobile}`;

export function isCustomerBlocked(mobile: string) {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(BLOCKED_USERS_KEY) ?? "[]");
    return Array.isArray(saved) && saved.includes(customerUserId(mobile));
  } catch {
    return false;
  }
}