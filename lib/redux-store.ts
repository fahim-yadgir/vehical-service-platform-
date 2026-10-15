"use client";

import { useSyncExternalStore } from "react";
import { revenue, tenants as initialTenants } from "./mock-data";

export type Tenant = (typeof initialTenants)[number];

export type RecentMember = {
  id: string;
  name: string;
  tenant: string;
  joined: string;
  status: "Active" | "Inactive";
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
  selectedRevenueMonth: string;
  tenantFilter: TenantFilter;
};

type AppAction =
  | { type: "revenue/monthSelected"; payload: string }
  | { type: "tenants/added"; payload: Tenant }
  | { type: "tenants/filterChanged"; payload: TenantFilter };

const initialState: AppState = {
  tenants: initialTenants,
  selectedRevenueMonth: "Oct",
  tenantFilter: "all",
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "revenue/monthSelected":
      return { ...state, selectedRevenueMonth: action.payload };
    case "tenants/added":
      return { ...state, tenants: [...state.tenants, action.payload] };
    case "tenants/filterChanged":
      return { ...state, tenantFilter: action.payload };
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
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAppSelector<Result>(selector: (value: AppState) => Result) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(initialState),
  );
}

export const revenueMonths = ["all", ...revenue.map(({ month }) => month)];