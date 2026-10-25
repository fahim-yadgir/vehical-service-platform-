"use client";

import { useSyncExternalStore } from "react";
import { getSessionAccount } from "./tenantAccounts";

export type OrderEvent = { at: string; by: string; role: string; text: string };

/** Changes made on top of the mock bookings. DEMO ONLY: the backend will keep these in bookings and booking_events. */
export type OrderOps = {
  status?: string;
  assignedStaffId?: string;
  updatedBy?: string;
  updatedAt?: string; // ISO date-time
  history?: OrderEvent[];
};
type OpsMap = Record<string, OrderOps>;

const KEY = "vehicle-service-platform.order-ops";
const EMPTY: OpsMap = {};
let state: OpsMap = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

/** Load saved changes after a refresh. */
export function restoreOrderOps() {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      state = saved as OpsMap;
      emit();
    }
  } catch {}
}

/** Save a change and add it to the order's history (who, when, what). */
export function updateOrder(
  id: string,
  patch: Pick<OrderOps, "status" | "assignedStaffId">,
  text: string,
) {
  const account = getSessionAccount();
  const event: OrderEvent = {
    at: new Date().toISOString(),
    by: account?.name ?? "Unknown",
    role: account?.role ?? "unknown",
    text,
  };
  const current = state[id] ?? {};
  state = {
    ...state,
    [id]: {
      ...current,
      ...patch,
      updatedBy: event.by,
      updatedAt: event.at,
      history: [...(current.history ?? []), event],
    },
  };
  persist();
  emit();
}

export function useOrderOps() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => EMPTY,
  );
}

// ---- status rules ----
export const statusFlow: string[] = [
  "pending",
  "driver_assigned",
  "pickup_otp_verified",
  "in_transit",
  "at_centre",
  "inspection",
  "repair_in_progress",
  "quality_check",
  "ready_for_delivery",
  "delivery_otp_verified",
  "completed",
];

/** Dashboard board columns. */
export const orderStages = [
  { title: "New", statuses: ["pending", "driver_assigned"] },
  { title: "Pickup", statuses: ["pickup_otp_verified", "in_transit"] },
  {
    title: "In workshop",
    statuses: ["at_centre", "inspection", "repair_in_progress", "quality_check"],
  },
  { title: "Delivery", statuses: ["ready_for_delivery", "delivery_otp_verified"] },
];

export const isClosed = (s: string) => s === "completed" || s === "cancelled";

/** The manager can move an order one step forward, or cancel it. */
export function nextStatuses(current: string): string[] {
  if (isClosed(current)) return [];
  const i = statusFlow.indexOf(current);
  const next = i >= 0 && i < statusFlow.length - 1 ? [statusFlow[i + 1]] : [];
  return [...next, "cancelled"];
}

export const statusLabel = (s: string) => s.replaceAll("_", " ");

export function statusTone(s: string): "green" | "red" | "yellow" | "gray" {
  if (s === "completed") return "green";
  if (s === "cancelled") return "red";
  if (s === "pending") return "gray";
  return "yellow";
}

export function statusProgress(s: string) {
  if (s === "cancelled") return 0;
  const i = statusFlow.indexOf(s);
  return i < 0 ? 0 : Math.round((i / (statusFlow.length - 1)) * 100);
}

export const formatOrderTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// ---- actions (used by the manager pages, later by staff and owner too) ----
export function changeOrderStatus(id: string, from: string, to: string) {
  updateOrder(id, { status: to }, `Status changed: ${statusLabel(from)} → ${statusLabel(to)}`);
}

export function assignOrder(id: string, status: string, staffId: string, staffName: string) {
  updateOrder(
    id,
    {
      assignedStaffId: staffId,
      // assigning a pending order moves it forward
      ...(status === "pending" ? { status: "driver_assigned" } : {}),
    },
    `Assigned to ${staffName}`,
  );
}