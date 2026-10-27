"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Badge from "../../../components/ui/Badge";
import { useCustomerOrders } from "../../../lib/customerOrders";
import { useAppSelector } from "../../../lib/redux-store";
import { money, statusLabel, statusProgress, statusTone, vehicleName } from "../../../lib/orders";

export default function CustomerBookings() {
  const { orders } = useCustomerOrders();
  const tenants = useAppSelector((s) => s.tenants);

  return (
    <>
      <Topbar title="My Bookings" subtitle="Track every service booking" />
      <div className="container space-y-5 md:!pl-6">
        <div className="flex justify-end">
          <Link href="/customer/bookings/new" className="btn btn-primary">
            <Plus size={16} /> New booking
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="card py-12 text-center text-sm text-slate-500">No bookings yet. Book your first service.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((o) => (
              <Link key={o.id} href={`/customer/bookings/${o.id}`} className="card block space-y-3 p-5 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{o.id}</p>
                    <p className="muted text-xs">{o.date} · {tenants.find((t) => t.id === o.tenantId)?.name ?? "Service centre"}</p>
                  </div>
                  <Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge>
                </div>
                <p className="text-sm font-semibold">{vehicleName(o)} · {o.service}</p>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.max(8, statusProgress(o.status))}%` }} />
                </div>
                <p className="text-sm font-bold">{o.amount > 0 ? money(o.amount) : "Price to be confirmed"}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}