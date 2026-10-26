"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import OrderDetails from "../../../../components/orders/OrderDetails";
import { useStaffWorkspace } from "@/lib/staffSession";
import { isClosed, vehicleName } from "../../../../lib/orders";

// Leaflet needs `window`, so the map loads on the client only.
const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => <div className="grid h-[380px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">Loading map...</div>,
});

export default function StaffOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { me, orders } = useStaffWorkspace();
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

  return (
    <>
      <Topbar title={`Order ${order.id}`} subtitle={`${vehicleName(order)} · ${order.service}`} />
      <div className="container space-y-5">
        <Link href="/staff/orders" className="btn btn-secondary">← Back to orders</Link>

        {order.pickup && !isClosed(order.status) && (
          <section className="card space-y-3 p-6">
            <b>Route to pickup</b>
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