"use client";

/**
 * DEMO ONLY. Logins of tenant staff (owner, later manager/drivers) kept in this browser so the
 * "temporary password -> forced change" flow can be tried without a backend.
 * The real backend must hash passwords (bcrypt/argon2) and never trust the browser.
 */
export type AccountRole = "owner" | "manager";

export type TenantAccount = {
  mobile: string;
  email?: string;
  name: string;
  role: AccountRole;
  tenantId: string;
  hash: string;
  mustChangePassword: boolean;
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
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: TenantAccount[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

/** Creates (or replaces) the login for a mobile number with a temporary password. */
export async function createAccount(a: Omit<TenantAccount, "hash" | "mustChangePassword"> & { password: string }) {
  const { password, ...rest } = a;
  const account: TenantAccount = { ...rest, hash: await hashPassword(a.mobile, password), mustChangePassword: true };
  saveAccounts([...loadAccounts().filter((x) => x.mobile !== a.mobile), account]);
}

export function removeTenantAccounts(tenantId: string) {
  saveAccounts(loadAccounts().filter((x) => x.tenantId !== tenantId));
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