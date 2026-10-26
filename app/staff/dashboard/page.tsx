"use client";

import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import Badge from "../../../components/ui/Badge";
import { useStaffWorkspace } from "@/lib/staffSession";
import { navigateUrl } from "@/lib/navigation";
import { money, statusLabel, statusTone, vehicleName } from "../../../lib/orders";

export default function StaffDashboard() {
  const { me, orders, open, completed } = useStaffWorkspace();

  return (
    <>
      <Topbar title="Dashboard" subtitle={me ? `Welcome, ${me.name}` : "Your assigned orders"} />
      <div className="container space-y-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon="receipt" label="All orders" value={orders.length} />
          <KpiCard icon="check" label="Completed" value={completed.length} />
          <KpiCard icon="clock" label="Incomplete" value={open.length} change="Open and in progress" />
          <KpiCard icon="activity" label="Cancelled" value={orders.length - open.length - completed.length} />
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">New orders assigned to you</h2>
              <p className="text-sm text-slate-500">Orders that are not completed or cancelled.</p>
            </div>
            <Link href="/staff/orders" className="text-sm font-bold text-orange-600 hover:underline">
              See all orders
            </Link>
          </div>

          {open.length === 0 ? (
            <p className="card py-10 text-center text-sm text-slate-500">No pending orders. New assignments will show up here.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {open.map((o) => (
                <article key={o.id} className="card space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/staff/orders/${o.id}`} className="font-black hover:underline">{o.id}</Link>
                      <p className="muted text-xs">{o.date}</p>
                    </div>
                    <Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge>
                  </div>

                  <div className="text-sm">
                    <p className="font-semibold">{vehicleName(o)} · {o.service}</p>
                    <p className="muted">{o.customer.name} · {o.customer.mobile}</p>
                    <p className="mt-1 font-semibold">{money(o.amount)}</p>
                  </div>

                  <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />
                    {o.pickup?.address ?? "No pickup location added yet"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/staff/orders/${o.id}`} className="btn btn-secondary">
                      {o.pickup ? "View route" : "View details"}
                    </Link>
                    {o.pickup && (
                      <a
                        href={navigateUrl(o.pickup)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold !text-white hover:bg-blue-700"
                      >
                        <Navigation size={15} /> Navigate
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}