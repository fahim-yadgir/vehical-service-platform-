"use client";

import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import Badge from "../ui/Badge";
import { fmtDate, inr, ORDER_STATUSES, orderTotal, type Order, type OrderStatus } from "../../lib/orders";
import type { StaffMember } from "../../lib/redux-store";

type Props = {
  order: Order;
  /** How many orders this customer has placed with the centre (this one included). */
  customerOrders: number;
  /** All staff of the centre. Only active ones can be newly appointed. */
  staff: StaffMember[];
  onAppoint: (staffId: string) => void;
  /** Returns an error message when the change isn't allowed. */
  onStatus: (status: OrderStatus) => string | null;
  onClose: () => void;
};

const tone: Record<OrderStatus, "blue" | "yellow" | "green" | "red"> = { New: "blue", Assigned: "yellow", "In Progress": "yellow", Completed: "green", Cancelled: "red" };

/** A side panel with everything about one order, where the owner appoints staff and moves the status. */
export default function ViewOrderDetail({ order, customerOrders, staff, onAppoint, onStatus, onClose }: Props) {
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const closed = order.status === "Completed" || order.status === "Cancelled";
  const active = staff.filter((m) => m.status === "Active");
  const current = staff.find((m) => m.id === order.assignedTo);
  const currentUnavailable = !!order.assignedTo && !active.some((m) => m.id === order.assignedTo);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="order-title" className="h-full w-full max-w-md space-y-6 overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="order-title" className="text-xl font-black text-slate-900">{order.id}</h2>
            <p className="mt-1 text-sm text-slate-500">{fmtDate(order.date)} · {order.source === "customer" ? "Booked by customer" : "Created by you"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={tone[order.status]}>{order.status}</Badge>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>

        <section className="space-y-1 rounded-2xl bg-slate-50 p-4" aria-label="Customer">
          <p className="font-black text-slate-900">{order.customer}</p>
          <a href={`tel:${order.mobile}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline"><Phone size={14} /> {order.mobile}</a>
          <p className="text-xs text-slate-500">{customerOrders} order{customerOrders === 1 ? "" : "s"} with your centre</p>
          <p className="pt-2 text-sm text-slate-700"><span className="text-xs font-bold text-slate-400">Vehicle </span>{order.vehicle}</p>
        </section>

        <section aria-label="Work and price">
          <h3 className="mb-2 text-sm font-black text-slate-900">Work &amp; price</h3>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 px-4 py-3"><span>{i.name}</span><b>{inr(i.price)}</b></li>
            ))}
            <li className="flex justify-between gap-3 bg-slate-50 px-4 py-3 font-black"><span>Total</span><span>{inr(orderTotal(order))}</span></li>
          </ul>
          {order.notes && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><span className="font-bold">Note: </span>{order.notes}</p>}
        </section>

        <section className="space-y-3" aria-label="Staff and status">
          <label className="block space-y-2">
            <span className="text-sm font-black text-slate-900">Appointed staff</span>
            <select
              value={order.assignedTo ?? ""}
              disabled={closed}
              onChange={(e) => { setError(""); onAppoint(e.target.value); }}
              className="input"
            >
              <option value="">{closed ? "—" : "Not appointed"}</option>
              {active.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role === "Driver" ? "Staff/Driver" : "Manager"}</option>)}
              {currentUnavailable && <option value={order.assignedTo}>{current?.name ?? "Removed staff"} (unavailable)</option>}
            </select>
            {!closed && active.length === 0 && <span className="block text-xs text-slate-500">No active staff. Add managers or staff in My Staff first.</span>}
            {currentUnavailable && <span className="block text-xs font-semibold text-amber-700">This person is suspended or removed. Appoint someone else.</span>}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-black text-slate-900">Status</span>
            <select value={order.status} onChange={(e) => setError(onStatus(e.target.value as OrderStatus) ?? "")} className="input">
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        </section>
      </aside>
    </div>
  );
}