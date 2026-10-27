"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KeyRound, Phone, ShieldCheck } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Badge from "../../../../components/ui/Badge";
import { useCustomerOrders } from "../../../../lib/customerOrders";
import { useAppSelector } from "../../../../lib/redux-store";
import {
  changeOrderStatus,
  formatOrderTime,
  isClosed,
  money,
  statusLabel,
  statusProgress,
  statusTone,
  vehicleName,
  verifyPickupOtp,
} from "../../../../lib/orders";

export default function BookingTracking() {
  const { id } = useParams<{ id: string }>();
  const { orders } = useCustomerOrders();
  const staff = useAppSelector((s) => s.staff);
  const tenants = useAppSelector((s) => s.tenants);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const order = orders.find((o) => o.id === id); // only this customer's own bookings
  if (!order) {
    return (
      <>
        <Topbar title="Booking not found" subtitle="This booking doesn't exist." />
        <div className="container md:!pl-6">
          <Link href="/customer/bookings" className="btn btn-secondary">Back to bookings</Link>
        </div>
      </>
    );
  }

  const centre = tenants.find((t) => t.id === order.tenantId)?.name;
  const person = order.assignedStaffId ? staff.find((m) => m.id === order.assignedStaffId) : undefined;
  const history = [...order.history].reverse();
  const canCancel = order.status === "pending" || order.status === "driver_assigned";

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const result = verifyPickupOtp(order.id, code);
    if (result.ok) {
      setCode("");
      setError("");
    } else {
      setError(result.error);
    }
  };

  const cancel = () => {
    if (window.confirm("Cancel this booking?")) changeOrderStatus(order.id, order.status, "cancelled");
  };

  return (
    <>
      <Topbar title={`Booking ${order.id}`} subtitle={`${vehicleName(order)} · ${order.service}`} />
      <div className="container space-y-5 md:!pl-6">
        <Link href="/customer/bookings" className="btn btn-secondary">← My bookings</Link>

        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>{centre ?? "Service centre"}</b>
            <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(8, statusProgress(order.status))}%` }} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="muted text-xs">Date</dt><dd className="font-semibold">{order.date}</dd></div>
            <div><dt className="muted text-xs">Amount</dt><dd className="font-semibold">{order.amount > 0 ? money(order.amount) : "To be confirmed"}</dd></div>
            <div><dt className="muted text-xs">Pickup address</dt><dd className="font-semibold">{order.pickup?.address ?? "—"}</dd></div>
          </dl>
        </section>

        {person && !isClosed(order.status) && (
          <section className="card flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <p className="muted text-xs">Your pickup person</p>
              <p className="text-lg font-black">{person.name}</p>
            </div>
            <a href={`tel:${person.mobile}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Phone size={16} /> {person.mobile}
            </a>
          </section>
        )}

        {/* PICKUP: the customer types the OTP the staff member tells them */}
        {order.status === "driver_assigned" && (
          <section className="card space-y-4 border-orange-200 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-orange-500" />
              <div>
                <h2 className="font-black text-slate-900">Verify before you hand over your vehicle</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Ask the staff member for the 4-digit OTP shown in their app. Enter it here. Hand over the vehicle only if it is accepted.
                </p>
              </div>
            </div>
            <form onSubmit={submitOtp} className="flex flex-wrap items-start gap-3">
              <div>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  aria-label="Pickup OTP"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  className="input w-40 text-center text-xl font-black tracking-[.4em]"
                  placeholder="••••"
                />
                {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
              </div>
              <button type="submit" disabled={code.length !== 4} className="btn btn-primary">
                <KeyRound size={16} /> Verify OTP
              </button>
            </form>
          </section>
        )}

        {order.status === "pickup_otp_verified" && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Pickup verified. Your vehicle is with our staff and on its way to the centre.
          </p>
        )}

        {/* DELIVERY: the customer shows this OTP; the staff member types it */}
        {order.status === "ready_for_delivery" && order.deliveryOtp && (
          <section className="card space-y-3 border-emerald-200 p-6 text-center">
            <h2 className="font-black text-slate-900">Your vehicle is ready for delivery</h2>
            <p className="text-sm text-slate-600">Tell this OTP to the staff member when they hand your vehicle back. Do not share it before that.</p>
            <p className="text-5xl font-black tracking-[.3em] text-slate-900">{order.deliveryOtp}</p>
          </section>
        )}

        {canCancel && (
          <button type="button" onClick={cancel} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50">
            Cancel booking
          </button>
        )}

        <section className="card p-6">
          <b>Updates</b>
          <ol className="mt-4 space-y-4">
            {history.map((h, i) => (
              <li key={i} className="border-l-2 border-slate-200 pl-4 text-sm">
                <p className="font-semibold">{h.text}</p>
                <p className="muted text-xs">{formatOrderTime(h.at)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}