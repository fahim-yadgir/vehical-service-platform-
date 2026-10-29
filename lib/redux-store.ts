"use client";

import { useSyncExternalStore } from "react";
import {revenue} from "./mock-data"
export type Tenant = {
  id: string;
  name: string;
  owner: string;
  status: string; // "Active" | "Suspended"
  plan: string;
  /** Kept for the owner/manager pages. The admin panel counts real people from the staff list instead. */
  users: number;
  createdAt: string; // yyyy-mm-dd
  subscriptionExpiresAt: string; // yyyy-mm-dd
  mobile?: string;
  email?: string;
};

/** A manager or driver the owner added to their service centre ("My Staff"). */
export type StaffMember = {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string;
  role: "Manager" | "staff";
  status: "Active" | "Suspended";
  createdAt: string; // yyyy-mm-dd
};

export type TenantFilter = "all" | "new" | "old" | "expiring" | "expired" | "active" | "suspended";

type AppState = {
  tenants: Tenant[];
  staff: StaffMember[];
  selectedRevenueMonth: string;
  tenantFilter: TenantFilter;
};

type AppAction =
  | { type: "revenue/monthSelected"; payload: string }
  | { type: "tenants/added"; payload: Tenant }
  | { type: "tenants/updated"; payload: Tenant }
  | { type: "tenants/deleted"; payload: string }
  | { type: "tenants/restored"; payload: Tenant[] }
  | { type: "tenants/filterChanged"; payload: TenantFilter }
  | { type: "staff/added"; payload: StaffMember }
  | { type: "staff/updated"; payload: StaffMember }
  | { type: "staff/deleted"; payload: string }
  | { type: "staff/removedForTenant"; payload: string }
  | { type: "staff/restored"; payload: StaffMember[] };

export const tenantsStorageKey = "vehicle-service-platform.tenants";
export const staffStorageKey = "vehicle-service-platform.staff";

const initialState: AppState = {
  tenants: [],
  staff: [],
  selectedRevenueMonth: "Oct",
  tenantFilter: "all",
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "revenue/monthSelected":
      return { ...state, selectedRevenueMonth: action.payload };
    case "tenants/added":
      return { ...state, tenants: [...state.tenants, action.payload] };
    case "tenants/updated":
      return { ...state, tenants: state.tenants.map((tenant) => tenant.id === action.payload.id ? action.payload : tenant) };
    case "tenants/deleted":
      return { ...state, tenants: state.tenants.filter((tenant) => tenant.id !== action.payload) };
    case "tenants/restored":
      return { ...state, tenants: action.payload };
    case "tenants/filterChanged":
      return { ...state, tenantFilter: action.payload };
    case "staff/added":
      return { ...state, staff: [...state.staff, action.payload] };
    case "staff/updated":
      return { ...state, staff: state.staff.map((m) => (m.id === action.payload.id ? action.payload : m)) };
    case "staff/deleted":
      return { ...state, staff: state.staff.filter((m) => m.id !== action.payload) };
    case "staff/removedForTenant":
      return { ...state, staff: state.staff.filter((m) => m.tenantId !== action.payload) };
    case "staff/restored":
      return { ...state, staff: action.payload };
    default:
      return state;
  }
}

let state = initialState;
const listeners = new Set<() => void>();

export const store = {
  getState: () => state,
  dispatch: (action: AppAction) => {
    state = reducer(state, action);
    if (typeof window !== "undefined" && (action.type === "tenants/added" || action.type === "tenants/updated" || action.type === "tenants/deleted")) {
      try {
        window.localStorage.setItem(tenantsStorageKey, JSON.stringify(state.tenants));
      } catch {
      }
    }
    if (typeof window !== "undefined" && (action.type === "staff/added" || action.type === "staff/updated" || action.type === "staff/deleted" || action.type === "staff/removedForTenant")) {
      try {
        window.localStorage.setItem(staffStorageKey, JSON.stringify(state.staff));
      } catch {
      }
    }
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** The three demo tenants older versions of the app started with. They are dropped if still saved in this browser. */
const OLD_DEMO_TENANTS = [
  { id: "TEN001", name: "AutoCare Pune", owner: "Rahul Patil" },
  { id: "TEN002", name: "Speed Motors", owner: "Amit Shah" },
  { id: "TEN003", name: "Prime Auto", owner: "Sameer Khan" },
];
const isOldDemoTenant = (t: Tenant) => OLD_DEMO_TENANTS.some((d) => d.id === t.id && d.name === t.name && d.owner === t.owner);

/** Load tenants saved by the Tenants page, so every admin page shows the same data after a refresh. */
export function restoreTenants() {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(tenantsStorageKey) ?? "null");
    if (!Array.isArray(saved)) return;
    const real = (saved as Tenant[]).filter((t) => !isOldDemoTenant(t));
    if (real.length !== saved.length) window.localStorage.setItem(tenantsStorageKey, JSON.stringify(real));
    store.dispatch({ type: "tenants/restored", payload: real });
  } catch {}
}

/** Real headcount of one service centre: the owner plus the managers and staff added to it. */
export function tenantHeadcount(staff: StaffMember[], tenantId: string) {
  const mine = staff.filter((m) => m.tenantId === tenantId);
  const managers = mine.filter((m) => m.role === "Manager").length;
  return { managers, staff: mine.length - managers, total: 1 + mine.length };
}

/** Load the staff owners added, so Owner, Manager and Admin pages all see the same people after a refresh. */
export function restoreStaff() {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(staffStorageKey) ?? "null");
    if (Array.isArray(saved)) store.dispatch({ type: "staff/restored", payload: saved as StaffMember[] });
  } catch {}
}

export function useAppSelector<Result>(selector: (value: AppState) => Result) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(initialState),
  );
}

export const revenueMonths = ["all", ...revenue.map(({ month }) => month)];