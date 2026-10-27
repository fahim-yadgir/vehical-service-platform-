"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import OrderDetails from "../../../../components/orders/OrderDetails";
import { useStaffWorkspace } from "../../../../lib/staffSession";
import { isClosed, vehicleName, verifyDeliveryOtp } from "../../../../lib/orders";

// Leaflet needs `window`, so the map loads on the client only.
const RouteMap = dynamic(() => import("../../../../components/map/RouteMap"), {
  ssr: false,
  loading: () => <div className="grid h-[380px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">Loading map...</div>,
});

export default function StaffOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { me, orders } = useStaffWorkspace();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const order = orders.find((o) => o.id === id); // only this person's orders can be opened

  if (!order) {
    return (
      <>
        <Topbar title="Order not found" subtitle="This order isn't assigned to you." />
        <div className="container">
          <Link href="/staff/orders" className="btn btn-secondary">Back to orders</Link>
        </div>
      </>
    );
  }

  const submitDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const result = verifyDeliveryOtp(order.id, code);
    if (result.ok) {
      setCode("");
      setError("");
    } else {
      setError(result.error);
    }
  };

  return (
    <>
      <Topbar title={`Order ${order.id}`} subtitle={`${vehicleName(order)} · ${order.service}`} />
      <div className="container space-y-5">
        <Link href="/staff/orders" className="btn btn-secondary">← Back to orders</Link>

        {/* PICKUP: staff shows this OTP; the customer types it in their app */}
        {order.status === "driver_assigned" && order.pickupOtp && (
          <section className="card space-y-3 border-orange-200 p-6 text-center">
            <h2 className="font-black text-slate-900">Pickup OTP</h2>
            <p className="text-sm text-slate-600">
              Tell this OTP to the customer. They enter it in their app. Take the vehicle only after they confirm.
            </p>
            <p className="text-5xl font-black tracking-[.3em] text-slate-900">{order.pickupOtp}</p>
          </section>
        )}

        {/* DELIVERY: the customer tells the OTP; staff types it */}
        {order.status === "ready_for_delivery" && (
          <section className="card space-y-4 border-emerald-200 p-6">
            <div>
              <h2 className="font-black text-slate-900">Deliver the vehicle</h2>
              <p className="mt-1 text-sm text-slate-600">
                Ask the customer for the 4-digit OTP from their app and enter it here. Hand over the vehicle only if it is accepted.
              </p>
            </div>
            <form onSubmit={submitDelivery} className="flex flex-wrap items-start gap-3">
              <div>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  aria-label="Delivery OTP"
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
                <KeyRound size={16} /> Verify &amp; hand over
              </button>
            </form>
          </section>
        )}

        {order.pickup && !isClosed(order.status) && (
          <section className="card space-y-3 p-6">
            <b>Route to the customer</b>
            <RouteMap destination={order.pickup} address={order.pickup.address} />
          </section>
        )}
        {!order.pickup && !isClosed(order.status) && (
          <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
            No pickup location was added for this order. Ask your manager or owner.
          </p>
        )}

        <OrderDetails order={order} assignedName={me?.name} />
      </div>
    </>
  );
}