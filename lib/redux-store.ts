"use client";

import { useSyncExternalStore } from "react";
import { revenue, tenants as initialTenants } from "./mock-data";

export type Tenant = (typeof initialTenants)[number] & { mobile?: string; email?: string };

export type RecentMember = {
  id: string;
  name: string;
  tenant: string;
  joined: string;
  status: "Active" | "Inactive";
};

/** A manager or driver the owner added to their service centre ("My Staff"). */
export type StaffMember = {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string;
  role: "Manager" | "Driver";
  status: "Active" | "Suspended";
  createdAt: string; // yyyy-mm-dd
};

export type TenantFilter = "all" | "new" | "old" | "expiring" | "expired" | "active" | "suspended";

export const recentMembers: RecentMember[] = [
  { id: "MEM1048", name: "Ananya Deshmukh", tenant: "AutoCare Pune", joined: "14 Oct 2026", status: "Active" },
  { id: "MEM1047", name: "Kabir Joshi", tenant: "Speed Motors", joined: "12 Oct 2026", status: "Active" },
  { id: "MEM1046", name: "Meera Kulkarni", tenant: "Prime Auto", joined: "10 Oct 2026", status: "Active" },
  { id: "MEM1045", name: "Arjun Rao", tenant: "AutoCare Pune", joined: "08 Oct 2026", status: "Inactive" },
  { id: "MEM1044", name: "Sara Khan", tenant: "Speed Motors", joined: "05 Oct 2026", status: "Active" },
];

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

const seedContacts: Record<string, { mobile: string; email?: string }> = {
  TEN001: { mobile: "9822011001", email: "rahul@autocarepune.in" },
  TEN002: { mobile: "9822011002" },
  TEN003: { mobile: "9822011003", email: "sameer@primeauto.in" },
};
const seededTenants: Tenant[] = initialTenants.map((t) => ({ ...t, ...seedContacts[t.id] }));

const initialState: AppState = {
  tenants: seededTenants,
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

/** Load tenants saved by the Tenants page, so every admin page shows the same data after a refresh. */
export function restoreTenants() {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(tenantsStorageKey) ?? "null");
    if (Array.isArray(saved)) store.dispatch({ type: "tenants/restored", payload: saved as Tenant[] });
  } catch {}
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