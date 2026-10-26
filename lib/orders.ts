"use client";

import { useSyncExternalStore } from "react";
import { getSessionAccount } from "./tenantAccounts";

export type OrderEvent = { at: string; by: string; role: string; text: string };
export type Actor = { name: string; role: string; at: string };

/** DEMO ONLY: the backend will keep these in bookings and booking_events. */
export type Order = {
  id: string;
  tenantId?: string; // empty on the demo seed orders (visible to every centre)
  customer: { name: string; mobile: string };
  vehicle: { type: string; brand: string; model: string; registrationNo: string; year?: number };
  service: string;
  date: string;
  amount: number;
  notes?: string;
  status: string;
  assignedStaffId?: string;
  createdBy: Actor;
  supervisedBy?: string;
  completedBy?: Actor;
  history: OrderEvent[];
};

const seedAt = "2026-10-08T09:00:00.000Z";
const seedBy: Actor = { name: "Fahim Yadgir", role: "customer", at: seedAt };
const created: OrderEvent = { at: seedAt, by: seedBy.name, role: "customer", text: "Order created" };

// Demo orders shown the first time, before anything is saved.
const SEED: Order[] = [
  {
    id: "BK1001",
    customer: { name: "Fahim Yadgir", mobile: "9876543210" },
    vehicle: { type: "Car", brand: "Honda", model: "City", registrationNo: "MH12AB1234", year: 2021 },
    service: "Full Service",
    date: "08 Oct 2026",
    amount: 4800,
    status: "repair_in_progress",
    createdBy: seedBy,
    history: [created],
  },
  {
    id: "BK1002",
    customer: { name: "Fahim Yadgir", mobile: "9876543210" },
    vehicle: { type: "Scooter", brand: "TVS", model: "Ntorq", registrationNo: "MH14XY5678", year: 2022 },
    service: "Oil Change",
    date: "05 Oct 2026",
    amount: 799,
    status: "completed",
    createdBy: seedBy,
    history: [created],
  },
];

const KEY = "vehicle-service-platform.orders";
let state: Order[] = SEED;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

/** Load saved orders after a refresh. Call it once on every page that reads or writes orders. */
export function restoreOrders() {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(saved) && saved.length) {
      state = saved as Order[];
      emit();
    }
  } catch {}
}

export function useOrders() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SEED,
  );
}

// ---- who is acting ----
function actor(): Actor {
  const a = getSessionAccount();
  return { name: a?.name ?? "Unknown", role: a?.role ?? "unknown", at: new Date().toISOString() };
}

function patchOrder(
  id: string,
  change: (o: Order, who: Actor) => Partial<Order>,
  text: string,
) {
  const who = actor();
  state = state.map((o) =>
    o.id !== id
      ? o
      : {
          ...o,
          ...change(o, who),
          // the first manager who handles an order becomes its supervisor
          supervisedBy: o.supervisedBy ?? (who.role === "manager" ? who.name : undefined),
          history: [...o.history, { at: who.at, by: who.name, role: who.role, text }],
        },
  );
  persist();
  emit();
}

// ---- actions ----
export function changeOrderStatus(id: string, from: string, to: string) {
  patchOrder(
    id,
    (_o, who) => ({ status: to, ...(to === "completed" ? { completedBy: who } : {}) }),
    `Status changed: ${statusLabel(from)} → ${statusLabel(to)}`,
  );
}

export function assignOrder(id: string, status: string, staffId: string, staffName: string) {
  patchOrder(
    id,
    () => ({
      assignedStaffId: staffId,
      // assigning a pending order moves it forward
      ...(status === "pending" ? { status: "driver_assigned" } : {}),
    }),
    `Assigned to ${staffName}`,
  );
}

export type NewOrder = {
  tenantId: string;
  customer: Order["customer"];
  vehicle: Order["vehicle"];
  service: string;
  date: string;
  amount: number;
  notes?: string;
  assignedStaff?: { id: string; name: string };
};

export function createOrder(input: NewOrder): string {
  const who = actor();
  const next = Math.max(1000, ...state.map((o) => Number(o.id.replace(/\D/g, "")) || 0)) + 1;
  const id = `BK${next}`;
  const event = (text: string): OrderEvent => ({ at: who.at, by: who.name, role: who.role, text });
  const history = [event("Order created")];
  if (input.assignedStaff) history.push(event(`Assigned to ${input.assignedStaff.name}`));

  const order: Order = {
    id,
    tenantId: input.tenantId,
    customer: input.customer,
    vehicle: input.vehicle,
    service: input.service,
    date: input.date,
    amount: input.amount,
    notes: input.notes,
    status: input.assignedStaff ? "driver_assigned" : "pending",
    assignedStaffId: input.assignedStaff?.id,
    createdBy: who,
    supervisedBy: who.role === "manager" ? who.name : undefined,
    history,
  };
  state = [order, ...state];
  persist();
  emit();
  return id;
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

// ---- display helpers ----
export const vehicleName = (o: Order) => `${o.vehicle.brand} ${o.vehicle.model}`;
export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const formatOrderTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
    /** Orders of one service centre (the demo seed orders belong to every centre). */
export const forTenant = (orders: Order[], tenantId?: string) =>
  orders.filter((o) => !o.tenantId || o.tenantId === tenantId);