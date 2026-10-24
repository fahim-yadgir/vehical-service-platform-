"use client";

import { useEffect } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import Badge from "../../../components/ui/Badge";
import SectionHeading from "../../../components/ui/SectionHeading";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../lib/redux-store";
import { fmtDate, inr, inrCompact, itemsSummary, monthlyRevenue, ordersPerCustomer, ORDER_STATUSES, orderTotal, useTenantOrders, type OrderStatus } from "../../../lib/orders";

const tone: Record<OrderStatus, "blue" | "yellow" | "green" | "red"> = { New: "blue", Assigned: "yellow", "In Progress": "yellow", Completed: "green", Cancelled: "red" };

export default function OwnerDashboard() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const { orders, loaded } = useTenantOrders(tenant?.id);
  const staff = useAppSelector((s) => s.staff);

  useEffect(() => restoreStaff(), []);

  const activeStaff = staff.filter((m) => m.tenantId === tenant?.id && m.status === "Active").length;
  const completed = orders.filter((o) => o.status === "Completed");
  const revenue = completed.reduce((sum, o) => sum + orderTotal(o), 0);
  const newOrders = orders.filter((o) => o.status === "New");
  const customers = Object.keys(ordersPerCustomer(orders)).length;
  const months = monthlyRevenue(orders, 6);
  const peak = Math.max(...months.map((m) => m.value), 0);
  const countOf = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const v = (value: string | number) => (loaded ? value : "—");

  return (
    <>
      <Topbar title="Owner Dashboard" subtitle={tenant ? `Business performance of ${tenant.name}` : "Business performance across your service centre"} />

      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard icon="rupee" label="Revenue" value={v(inrCompact(revenue))} change={loaded ? `from ${completed.length} completed order${completed.length === 1 ? "" : "s"}` : undefined} />
          <KpiCard icon="calendar" label="Total orders" value={v(orders.length)} change={loaded ? `from ${customers} customer${customers === 1 ? "" : "s"}` : undefined} />
          <KpiCard icon="clock" label="New orders" value={v(newOrders.length)} change={loaded && newOrders.length > 0 ? "waiting for staff" : undefined} />
          <KpiCard icon="users" label="Active staff" value={v(activeStaff)} />
        </div>

        {loaded && newOrders.length > 0 && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
            <p className="text-sm font-bold text-orange-800">{newOrders.length} new order{newOrders.length === 1 ? "" : "s"} waiting for staff to be appointed.</p>
            <Link href="/owner/allorders" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">Open All Orders</Link>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card p-6">
            <SectionHeading title="Revenue trend" description="Completed orders, last 6 months" />
            {loaded && peak === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No completed orders yet. Revenue appears here once orders are completed.</p>
            ) : (
              <div className="flex h-56 items-stretch gap-3" role="img" aria-label="Revenue per month for the last 6 months">
                {months.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">{m.value ? inrCompact(m.value) : ""}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div className="w-full rounded-t-lg bg-orange-400" style={{ height: `${peak ? Math.max(3, (m.value / peak) * 100) : 3}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-6">
            <SectionHeading title="New orders" action={<Link href="/owner/allorders" className="text-xs font-bold text-orange-600 hover:text-orange-700">View all</Link>} />
            {loaded && newOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No new orders. You&apos;re all caught up.</p>
            ) : (
              <div className="space-y-3">
                {newOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="font-bold">{o.id} <span className="muted text-xs font-normal">· {fmtDate(o.date)}</span></p>
                      <p className="muted truncate text-xs">{o.customer} · {itemsSummary(o)}</p>
                    </div>
                    <div className="shrink-0 space-y-1.5 text-right">
                      <b className="block">{inr(orderTotal(o))}</b>
                      <Link href={`/owner/allorders?order=${o.id}`} className="inline-block rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50">Appoint staff</Link>
                    </div>
                  </div>
                ))}
                {newOrders.length > 5 && <p className="text-center text-xs text-slate-500">+ {newOrders.length - 5} more in All Orders</p>}
              </div>
            )}
          </section>
        </div>

        <section className="card p-6">
          <SectionHeading title="Orders overview" description="Where all your orders stand right now" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ORDER_STATUSES.map((s) => (
              <div key={s} className="rounded-2xl bg-slate-50 p-4">
                <Badge tone={tone[s]}>{s}</Badge>
                <p className="mt-3 text-2xl font-black">{v(countOf(s))}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}