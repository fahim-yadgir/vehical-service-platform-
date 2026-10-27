"use client";

import { useSyncExternalStore } from "react";
import { getSessionAccount } from "./tenantAccounts";
import { getSessionRole } from "./auth";
import { loadProfile } from "./customerProfile";

export type OrderEvent = { at: string; by: string; role: string; text: string };
export type Actor = { name: string; role: string; at: string };
export type Pickup = { lat: number; lng: number; address: string };

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
  pickup?: Pickup;
  source?: "customer" | "centre";
  pickupOtp?: string;     // staff sees it; the customer types it
  deliveryOtp?: string;   // the customer sees it; staff types it
  otpAttempts?: number;   // inside type Order, e.g. after `notes?: string;`
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
  const role = a?.role ?? getSessionRole() ?? "unknown";
  const fallbackName =
    role === "owner" ? "Owner" : role === "manager" ? "Manager" : role === "customer" ? loadProfile().fullName : "Unknown";
  return { name: a?.name ?? fallbackName, role, at: new Date().toISOString() };
}
/** 4-digit OTP. DEMO ONLY: the backend must generate and store it (hashed, with an expiry). */
function makeOtp() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return String(n).padStart(4, "0");
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
    (_o, who) => ({
      status: to,
      ...(to === "completed" ? { completedBy: who } : {}),
      // the customer gets a delivery OTP when the vehicle is ready
      ...(to === "ready_for_delivery" ? { deliveryOtp: makeOtp(), otpAttempts: 0 } : {}),
    }),
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
      // a new person gets a fresh pickup OTP; the old one stops working
      ...(status === "pending" || status === "driver_assigned" ? { pickupOtp: makeOtp(), otpAttempts: 0 } : {}),
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
  pickup?: Pickup; 
  source?: "customer" | "centre";  // inside type Order, e.g. after `notes?: string;`
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
    pickup: input.pickup,
    source: input.source ?? "centre",
    pickupOtp: input.assignedStaff ? makeOtp() : undefined,
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
/** Steps that only happen by staff assignment or by an OTP match, never by hand. */
const guarded = ["driver_assigned", "pickup_otp_verified", "delivery_otp_verified"];

/** The owner/manager can move an order one step forward, or cancel it. */
export function nextStatuses(current: string): string[] {
  if (isClosed(current)) return [];
  const i = statusFlow.indexOf(current);
  const next = i >= 0 && i < statusFlow.length - 1 ? statusFlow[i + 1] : undefined;
  return [...(next && !guarded.includes(next) ? [next] : []), "cancelled"];
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
// ---- OTP handover ----
export type OtpResult = { ok: true } | { ok: false; error: string };
const MAX_ATTEMPTS = 5;

function verifyOtp(id: string, kind: "pickup" | "delivery", code: string): OtpResult {
  const o = state.find((x) => x.id === id);
  if (!o) return { ok: false, error: "Order not found." };
  const waitingFor = kind === "pickup" ? "driver_assigned" : "ready_for_delivery";
  const otp = kind === "pickup" ? o.pickupOtp : o.deliveryOtp;
  if (o.status !== waitingFor || !otp) return { ok: false, error: "No OTP is needed right now." };

  const used = o.otpAttempts ?? 0;
  if (used >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Please contact the service centre." };

  if (code.trim() !== otp) {
    state = state.map((x) => (x.id === id ? { ...x, otpAttempts: used + 1 } : x));
    persist();
    emit();
    const left = MAX_ATTEMPTS - (used + 1);
    return { ok: false, error: left > 0 ? `Wrong OTP. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Please contact the service centre." };
  }

  patchOrder(
    id,
    () => ({
      status: kind === "pickup" ? "pickup_otp_verified" : "delivery_otp_verified",
      otpAttempts: 0,
      ...(kind === "pickup" ? { pickupOtp: undefined } : { deliveryOtp: undefined }), // single use
    }),
    kind === "pickup" ? "Pickup OTP verified by customer: vehicle handed to staff" : "Delivery OTP verified by staff: vehicle handed to customer",
  );
  return { ok: true };
}

/** The customer types the OTP the staff member tells them. */
export const verifyPickupOtp = (id: string, code: string) => verifyOtp(id, "pickup", code);
/** The staff member types the OTP the customer tells them. */
export const verifyDeliveryOtp = (id: string, code: string) => verifyOtp(id, "delivery", code);