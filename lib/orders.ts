"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ymd } from "./revenue";

export const ORDER_STATUSES = ["New", "Assigned", "In Progress", "Completed", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** One piece of work in an order, e.g. "Oil Change" for 799. */
export type OrderItem = { id: string; name: string; price: number };

/** A customer's order at one service centre (tenant). */
export type Order = {
  id: string;
  tenantId: string;
  customer: string;
  mobile: string;
  vehicle: string;
  items: OrderItem[];
  date: string; // yyyy-mm-dd
  status: OrderStatus;
  notes?: string;
  /** Who made the order: the customer from their app, or the owner (phone / walk-in). */
  source: "customer" | "owner";
  /** Id of the StaffMember (My Staff) the owner appointed. */
  assignedTo?: string;
};

/** What the owner enters in "Create order". */
export type NewOrder = Pick<Order, "customer" | "mobile" | "vehicle" | "items" | "date" | "notes" | "assignedTo">;

export const orderTotal = (o: Pick<Order, "items">) => o.items.reduce((sum, i) => sum + i.price, 0);

/** "Full Service" or "Full Service +2 more". */
export const itemsSummary = (o: Pick<Order, "items">) => (o.items.length <= 1 ? (o.items[0]?.name ?? "—") : `${o.items[0].name} +${o.items.length - 1} more`);

// ---------- rules (pure, so every page applies the same ones) ----------

const isClosed = (o: Order) => o.status === "Completed" || o.status === "Cancelled";

/** Appointing staff moves a New order to Assigned. Choosing "no staff" puts an open order back to New. */
export function appointStaff(o: Order, staffId: string): Order {
  if (isClosed(o)) return o;
  if (!staffId) return { ...o, assignedTo: undefined, status: o.status === "Assigned" || o.status === "In Progress" ? "New" : o.status };
  return { ...o, assignedTo: staffId, status: o.status === "New" ? "Assigned" : o.status };
}

/** Moves an order to a new status, or says why it can't. */
export function changeStatus(o: Order, status: OrderStatus): { order: Order } | { error: string } {
  if (status === o.status) return { order: o };
  if ((status === "Assigned" || status === "In Progress") && !o.assignedTo) return { error: `Appoint staff before marking this order ${status.toLowerCase()}.` };
  if (status === "New" && o.assignedTo) return { error: "Remove the appointed staff first to move this order back to New." };
  return { order: { ...o, status } };
}

/** An open order that has no staff appointed yet. */
export const needsStaff = (o: Order) => !o.assignedTo && !isClosed(o);

/** How many orders each customer (by mobile) has placed, cancelled ones included. */
export function ordersPerCustomer(orders: Order[]) {
  const counts: Record<string, number> = {};
  orders.forEach((o) => (counts[o.mobile] = (counts[o.mobile] ?? 0) + 1));
  return counts;
}

/** Revenue of completed orders for the last `months` months (oldest first). */
export function monthlyRevenue(orders: Order[], months = 6) {
  const now = new Date();
  const out: { key: string; label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-IN", { month: "short" }), value: 0 });
  }
  orders.filter((o) => o.status === "Completed").forEach((o) => {
    const m = out.find((x) => x.key === o.date.slice(0, 7));
    if (m) m.value += orderTotal(o);
  });
  return out;
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const inrCompact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n));
export const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ---------- storage (localStorage until the backend exists) ----------

const KEY = "vehicle-service-platform.orders";
const DAY = 24 * 60 * 60 * 1000;
const newId = () => Math.random().toString(36).slice(2, 10);

/** Demo orders for the seeded demo centre (AutoCare Pune, TEN001). New centres start with none. */
function seedOrders(): Order[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ago = (days: number) => ymd(new Date(today.getTime() - days * DAY));
  type Row = [string, string, string, [string, number][], number, OrderStatus, Order["source"], string?];
  const rows: Row[] = [
    ["Ananya Deshmukh", "9822000001", "Honda City MH12AB1234", [["Full Service", 4800], ["Car Wash", 600]], 1, "New", "customer", "Please check the AC smell."],
    ["Kabir Joshi", "9822000002", "Hyundai i20 MH14CD5678", [["Oil Change", 1200]], 2, "New", "customer"],
    ["Meera Kulkarni", "9822000003", "Maruti Swift MH12EF2211", [["Brake Service", 3200]], 4, "New", "customer", "Pickup needed from Kothrud."],
    ["Arjun Rao", "9822000004", "TVS Ntorq MH12XY9876", [["Battery", 2800]], 5, "New", "owner"],
    ["Ananya Deshmukh", "9822000001", "Honda City MH12AB1234", [["Car Wash", 600]], 12, "Completed", "customer"],
    ["Sara Khan", "9822000005", "Tata Nexon MH12GH4455", [["AC Repair", 3900]], 20, "Completed", "customer"],
    ["Kabir Joshi", "9822000002", "Hyundai i20 MH14CD5678", [["Full Service", 5200]], 31, "Completed", "customer"],
    ["Vikram Patil", "9822000006", "Mahindra XUV300 MH12JK7788", [["Tyres & Alignment", 6400]], 44, "Completed", "owner"],
    ["Meera Kulkarni", "9822000003", "Maruti Swift MH12EF2211", [["Oil Change", 1100]], 62, "Completed", "customer"],
    ["Sara Khan", "9822000005", "Tata Nexon MH12GH4455", [["Full Service", 6100]], 85, "Completed", "customer"],
    ["Arjun Rao", "9822000004", "TVS Ntorq MH12XY9876", [["Oil Change", 650]], 110, "Cancelled", "customer"],
    ["Vikram Patil", "9822000006", "Mahindra XUV300 MH12JK7788", [["Brake Service", 3600]], 138, "Completed", "customer"],
  ];
  return rows.map(([customer, mobile, vehicle, items, days, status, source, notes], i) => ({
    id: `ORD${1001 + i}`,
    tenantId: "TEN001",
    customer,
    mobile,
    vehicle,
    items: items.map(([name, price]) => ({ id: newId(), name, price })),
    date: ago(days),
    status,
    source,
    notes,
  }));
}

const isOrder = (v: unknown): v is Order => {
  const o = v as Partial<Order> | null;
  return (
    !!o &&
    typeof o.id === "string" &&
    typeof o.tenantId === "string" &&
    typeof o.customer === "string" &&
    typeof o.date === "string" &&
    Array.isArray(o.items) &&
    o.items.every((i) => !!i && typeof i.name === "string" && typeof i.price === "number") &&
    ORDER_STATUSES.includes(o.status as OrderStatus)
  );
};

function write(orders: Order[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {}
}

/** All orders on this browser. The first time ever, the demo orders are saved. */
export function loadOrders(): Order[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) {
      const seed = seedOrders();
      write(seed);
      return seed;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isOrder) : [];
  } catch {
    return [];
  }
}

/** Orders of one service centre, newest first, with create/update. `loaded` is false until storage was read. */
export function useTenantOrders(tenantId: string | undefined) {
  const [all, setAll] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAll(loadOrders());
    setLoaded(true);
  }, []);

  const orders = useMemo(
    () => all.filter((o) => o.tenantId === tenantId).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [all, tenantId],
  );

  /** Works on the latest saved list so two pages never overwrite each other. */
  const commit = useCallback((change: (current: Order[]) => Order[]) => {
    const next = change(loadOrders());
    write(next);
    setAll(next);
  }, []);

  const update = useCallback((order: Order) => commit((cur) => cur.map((o) => (o.id === order.id ? order : o))), [commit]);

  const create = useCallback(
    (data: NewOrder): Order | null => {
      if (!tenantId) return null;
      let created: Order | null = null;
      commit((cur) => {
        const latest = cur.reduce((max, o) => Math.max(max, Number(o.id.replace(/\D/g, "")) || 0), 1000);
        created = { ...data, id: `ORD${latest + 1}`, tenantId, source: "owner", status: data.assignedTo ? "Assigned" : "New" };
        return [...cur, created];
      });
      return created;
    },
    [tenantId, commit],
  );

  return { orders, loaded, create, update };
}