"use client";

import { useSyncExternalStore } from "react";
import { getSessionAccount } from "./tenantAccounts";
import { getSessionRole } from "./auth";
import { loadProfile } from "./customerProfile";

export type OrderEvent = {
  at: string;
  by: string;
  role: string;
  text: string;
};

export type Actor = {
  name: string;
  role: string;
  at: string;
};

export type Pickup = {
  lat: number;
  lng: number;
  address: string;
};

export type ProofPhoto = {
  photoId: string;
  lat: number;
  lng: number;
  accuracy: number;
  takenAt: string;
};

export type Proof = {
  photos: ProofPhoto[];
  by: { name: string; role: string };
  savedAt: string;
};

export type ProofKind = "pickup" | "delivery";

export const MIN_PROOF_PHOTOS = 1;
export const MAX_PROOF_PHOTOS = 6;

const PROOF_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * The time the customer wants the vehicle picked up, saved as 24-hour "HH:MM" (for example "14:30").
 * Orders saved before the time picker was added hold "Morning", "Afternoon" or "Evening".
 */
export type TimeSlot = string;

/** "14:30" becomes "2:30 PM". Older values such as "Morning" are shown as they are. */
export function formatTimeSlot(slot?: string): string {
  if (!slot) return "";

  const match = /^(\d{1,2}):(\d{2})$/.exec(slot);
  if (!match) return slot;

  const hour = Number(match[1]);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${match[2]} ${period}`;
}

export type Order = {
  id: string;
  tenantId?: string;

  customer: {
    name: string;
    mobile: string;
  };

  vehicle: {
    type: string;
    brand: string;
    model: string;
    registrationNo: string;
    year?: number;
  };

  service: string;
  date: string;
  timeSlot?: TimeSlot;

  amount: number;
  notes?: string;

  status: string;

  // Booking request response
  rejectionReply?: string;
  respondedBy?: Actor;
  respondedAt?: string;

  assignedStaffId?: string;

  createdBy: Actor;
  supervisedBy?: string;
  completedBy?: Actor;

  history: OrderEvent[];

  pickup?: Pickup;

  source?: "customer" | "centre";

  pickupOtp?: string;
  deliveryOtp?: string;
  otpAttempts?: number;

  proofs?: {
    pickup?: Proof;
    delivery?: Proof;
  };
};

const seedAt = "2026-10-08T09:00:00.000Z";

const seedBy: Actor = {
  name: "Fahim Yadgir",
  role: "customer",
  at: seedAt,
};

const created: OrderEvent = {
  at: seedAt,
  by: seedBy.name,
  role: "customer",
  text: "Order created",
};

const SEED: Order[] = [
  {
    id: "BK1001",
    customer: {
      name: "Fahim Yadgir",
      mobile: "9876543210",
    },
    vehicle: {
      type: "Car",
      brand: "Honda",
      model: "City",
      registrationNo: "MH12AB1234",
      year: 2021,
    },
    service: "Full Service",
    date: "08 Oct 2026",
    amount: 4800,
    status: "repair_in_progress",
    createdBy: seedBy,
    history: [created],
  },
  {
    id: "BK1002",
    customer: {
      name: "Fahim Yadgir",
      mobile: "9876543210",
    },
    vehicle: {
      type: "Scooter",
      brand: "TVS",
      model: "Ntorq",
      registrationNo: "MH14XY5678",
      year: 2022,
    },
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

const emit = () => listeners.forEach((listener) => listener());

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function restoreOrders() {
  try {
    const saved: unknown = JSON.parse(
      window.localStorage.getItem(KEY) ?? "null",
    );

    if (Array.isArray(saved) && saved.length) {
      state = saved as Order[];
      emit();
    }
  } catch {}
}

export function useOrders() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => state,
    () => SEED,
  );
}

// ---- who is acting ----

function actor(): Actor {
  const account = getSessionAccount();

  const role = account?.role ?? getSessionRole() ?? "unknown";

  const fallbackName =
    role === "owner"
      ? "Owner"
      : role === "manager"
        ? "Manager"
        : role === "customer"
          ? loadProfile().fullName
          : "Unknown";

  return {
    name: account?.name ?? fallbackName,
    role,
    at: new Date().toISOString(),
  };
}

/** 4-digit OTP. DEMO ONLY. */
function makeOtp() {
  const n =
    crypto.getRandomValues(new Uint32Array(1))[0] % 10000;

  return String(n).padStart(4, "0");
}

function patchOrder(
  id: string,
  change: (order: Order, who: Actor) => Partial<Order>,
  text: string,
) {
  const who = actor();

  state = state.map((order) =>
    order.id !== id
      ? order
      : {
          ...order,
          ...change(order, who),

          supervisedBy:
            order.supervisedBy ??
            (who.role === "manager" ? who.name : undefined),

          history: [
            ...order.history,
            {
              at: who.at,
              by: who.name,
              role: who.role,
              text,
            },
          ],
        },
  );

  persist();
  emit();
}

// ---- normal order actions ----

export function changeOrderStatus(
  id: string,
  from: string,
  to: string,
) {
  const current = state.find((order) => order.id === id);

  if (
    !current ||
    current.status !== from ||
    from === "requested" ||
    from === "rejected"
  ) {
    return;
  }

  patchOrder(
    id,
    (_order, who) => ({
      status: to,

      ...(to === "completed"
        ? { completedBy: who }
        : {}),

      ...(to === "ready_for_delivery"
        ? {
            deliveryOtp: makeOtp(),
            otpAttempts: 0,
          }
        : {}),
    }),
    `Status changed: ${statusLabel(from)} → ${statusLabel(to)}`,
  );
}

export function assignOrder(
  id: string,
  status: string,
  staffId: string,
  staffName: string,
) {
  const current = state.find((order) => order.id === id);

  if (
    !current ||
    current.status !== status ||
    status === "requested" ||
    status === "rejected" ||
    status === "cancelled" ||
    status === "completed"
  ) {
    return;
  }

  patchOrder(
    id,
    () => ({
      assignedStaffId: staffId,

      ...(status === "pending"
        ? { status: "driver_assigned" }
        : {}),

      ...(status === "pending" || status === "driver_assigned"
        ? {
            pickupOtp: makeOtp(),
            otpAttempts: 0,
          }
        : {}),
    }),
    `Assigned to ${staffName}`,
  );
}

// ---- create order ----

export type NewOrder = {
  tenantId: string;

  customer: Order["customer"];
  vehicle: Order["vehicle"];

  service: string;
  date: string;
  timeSlot?: TimeSlot;

  amount: number;
  notes?: string;

  assignedStaff?: {
    id: string;
    name: string;
  };

  pickup?: Pickup;

  source?: "customer" | "centre";
};

export function createOrder(input: NewOrder): string {
  const who = actor();

  const next =
    Math.max(
      1000,
      ...state.map(
        (order) =>
          Number(order.id.replace(/\D/g, "")) || 0,
      ),
    ) + 1;

  const id = `BK${next}`;

  const event = (text: string): OrderEvent => ({
    at: who.at,
    by: who.name,
    role: who.role,
    text,
  });

  const history = [event("Order created")];

  if (input.assignedStaff) {
    history.push(
      event(`Assigned to ${input.assignedStaff.name}`),
    );
  }

  const order: Order = {
    id,

    tenantId: input.tenantId,

    customer: input.customer,
    vehicle: input.vehicle,

    service: input.service,
    date: input.date,
    timeSlot: input.timeSlot,

    amount: input.amount,
    notes: input.notes,

    // Customer booking creates a request.
    // Centre-created walk-in orders enter the normal flow.
    status:
      input.source === "customer"
        ? "requested"
        : input.assignedStaff
          ? "driver_assigned"
          : "pending",

    assignedStaffId: input.assignedStaff?.id,

    createdBy: who,

    supervisedBy:
      who.role === "manager" ? who.name : undefined,

    history,

    pickup: input.pickup,

    source: input.source ?? "centre",

    pickupOtp: input.assignedStaff
      ? makeOtp()
      : undefined,
  };

  state = [order, ...state];

  persist();
  emit();

  return id;
}

// ---- customer booking request actions ----

/**
 * Accept request only once.
 * Accepted request becomes a normal pending order.
 */
export function acceptOrderRequest(id: string): boolean {
  const order = state.find((item) => item.id === id);

  if (!order || order.status !== "requested") {
    return false;
  }

  const who = actor();

  state = state.map((item) =>
    item.id === id
      ? {
          ...item,

          status: "pending",

          respondedBy: who,
          respondedAt: who.at,

          supervisedBy:
            item.supervisedBy ??
            (who.role === "manager" ? who.name : undefined),

          history: [
            ...item.history,
            {
              at: who.at,
              by: who.name,
              role: who.role,
              text: "Booking request accepted",
            },
          ],
        }
      : item,
  );

  persist();
  emit();

  return true;
}

/**
 * Reject request only once.
 * Reply is mandatory.
 */
export function rejectOrderRequest(
  id: string,
  reply: string,
): boolean {
  const order = state.find((item) => item.id === id);

  const message = reply.trim();

  if (
    !order ||
    order.status !== "requested" ||
    !message
  ) {
    return false;
  }

  const who = actor();

  state = state.map((item) =>
    item.id === id
      ? {
          ...item,

          status: "rejected",

          rejectionReply: message,

          respondedBy: who,
          respondedAt: who.at,

          history: [
            ...item.history,
            {
              at: who.at,
              by: who.name,
              role: who.role,
              text: `Booking request rejected: ${message}`,
            },
          ],
        }
      : item,
  );

  persist();
  emit();

  return true;
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
  {
    title: "New",
    statuses: ["pending", "driver_assigned"],
  },
  {
    title: "Pickup",
    statuses: ["pickup_otp_verified", "in_transit"],
  },
  {
    title: "In workshop",
    statuses: [
      "at_centre",
      "inspection",
      "repair_in_progress",
      "quality_check",
    ],
  },
  {
    title: "Delivery",
    statuses: [
      "ready_for_delivery",
      "delivery_otp_verified",
    ],
  },
];

export const isClosed = (status: string) =>
  status === "completed" ||
  status === "cancelled" ||
  status === "rejected";

const guarded = [
  "driver_assigned",
  "pickup_otp_verified",
  "delivery_otp_verified",
];

export function nextStatuses(current: string): string[] {
  if (isClosed(current) || current === "requested") {
    return [];
  }

  const index = statusFlow.indexOf(current);

  const next =
    index >= 0 && index < statusFlow.length - 1
      ? statusFlow[index + 1]
      : undefined;

  return [
    ...(next && !guarded.includes(next) ? [next] : []),
    "cancelled",
  ];
}

export const statusLabel = (status: string) =>
  status.replaceAll("_", " ");

export function statusTone(
  status: string,
): "green" | "red" | "yellow" | "gray" {
  if (status === "completed") return "green";

  if (status === "cancelled" || status === "rejected") {
    return "red";
  }

  if (status === "requested") return "yellow";

  if (status === "pending") return "gray";

  return "yellow";
}

export function statusProgress(status: string) {
  if (
    status === "cancelled" ||
    status === "rejected" ||
    status === "requested"
  ) {
    return 0;
  }

  const index = statusFlow.indexOf(status);

  return index < 0
    ? 0
    : Math.round(
        (index / (statusFlow.length - 1)) * 100,
      );
}

// ---- display helpers ----

export const vehicleName = (order: Order) =>
  `${order.vehicle.brand} ${order.vehicle.model}`;

export const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN")}`;

export const formatOrderTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const forTenant = (
  orders: Order[],
  tenantId?: string,
) =>
  orders.filter(
    (order) =>
      !order.tenantId || order.tenantId === tenantId,
  );

// ---- OTP handover ----

export type OtpResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_ATTEMPTS = 5;

function verifyOtp(
  id: string,
  kind: "pickup" | "delivery",
  code: string,
): OtpResult {
  const order = state.find((item) => item.id === id);

  if (!order) {
    return {
      ok: false,
      error: "Order not found.",
    };
  }

  const waitingFor =
    kind === "pickup"
      ? "driver_assigned"
      : "ready_for_delivery";

  const otp =
    kind === "pickup"
      ? order.pickupOtp
      : order.deliveryOtp;

  if (order.status !== waitingFor || !otp) {
    return {
      ok: false,
      error: "No OTP is needed right now.",
    };
  }

  if (!order.proofs?.[kind]) {
    return {
      ok: false,
      error:
        kind === "pickup"
          ? "The service staff has not photographed the vehicle yet. Ask them to do it first, then try again."
          : "Take the delivery photos first.",
    };
  }

  const used = order.otpAttempts ?? 0;

  if (used >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error:
        "Too many wrong attempts. Please contact the service centre.",
    };
  }

  if (code.trim() !== otp) {
    state = state.map((item) =>
      item.id === id
        ? { ...item, otpAttempts: used + 1 }
        : item,
    );

    persist();
    emit();

    const left = MAX_ATTEMPTS - (used + 1);

    return {
      ok: false,
      error:
        left > 0
          ? `Wrong OTP. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many wrong attempts. Please contact the service centre.",
    };
  }

  patchOrder(
    id,
    () => ({
      status:
        kind === "pickup"
          ? "pickup_otp_verified"
          : "delivery_otp_verified",

      otpAttempts: 0,

      ...(kind === "pickup"
        ? { pickupOtp: undefined }
        : { deliveryOtp: undefined }),
    }),
    kind === "pickup"
      ? "Pickup OTP verified by customer: vehicle handed to staff"
      : "Delivery OTP verified by staff: vehicle handed to customer",
  );

  return { ok: true };
}

export const verifyPickupOtp = (
  id: string,
  code: string,
) => verifyOtp(id, "pickup", code);

export const verifyDeliveryOtp = (
  id: string,
  code: string,
) => verifyOtp(id, "delivery", code);

// ---- photo proof of pickup and delivery ----

export type SaveProofResult =
  | { ok: true }
  | { ok: false; error: string };

export function saveProof(
  id: string,
  kind: ProofKind,
  photos: ProofPhoto[],
): SaveProofResult {
  const order = state.find((item) => item.id === id);

  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  const stage =
    kind === "pickup"
      ? ["driver_assigned"]
      : ["ready_for_delivery"];

  if (!stage.includes(order.status)) {
    return {
      ok: false,
      error: "Photos are not needed at this stage.",
    };
  }

  if (order.proofs?.[kind]) {
    return {
      ok: false,
      error: "The photos for this step are already saved.",
    };
  }

  if (photos.length < MIN_PROOF_PHOTOS) {
    return {
      ok: false,
      error: "Take at least one photo.",
    };
  }

  if (photos.length > MAX_PROOF_PHOTOS) {
    return {
      ok: false,
      error: `Use at most ${MAX_PROOF_PHOTOS} photos.`,
    };
  }

  const now = Date.now();

  for (const photo of photos) {
    const taken = Date.parse(photo.takenAt);

    const place =
      Number.isFinite(photo.lat) &&
      Number.isFinite(photo.lng) &&
      Math.abs(photo.lat) <= 90 &&
      Math.abs(photo.lng) <= 180;

    if (
      !photo.photoId ||
      !place ||
      !Number.isFinite(photo.accuracy) ||
      !Number.isFinite(taken)
    ) {
      return {
        ok: false,
        error: "Every photo needs its location and time.",
      };
    }

    if (
      taken > now + 5 * 60 * 1000 ||
      now - taken > PROOF_MAX_AGE_MS
    ) {
      return {
        ok: false,
        error: "A photo is too old. Take the photos again.",
      };
    }
  }

  patchOrder(
    id,
    (_order, who) => ({
      proofs: {
        ...order.proofs,
        [kind]: {
          photos,
          by: {
            name: who.name,
            role: who.role,
          },
          savedAt: who.at,
        },
      },
    }),
    `${kind === "pickup" ? "Pickup" : "Delivery"} photos recorded (${photos.length} photo${photos.length === 1 ? "" : "s"})`,
  );

  return { ok: true };
}