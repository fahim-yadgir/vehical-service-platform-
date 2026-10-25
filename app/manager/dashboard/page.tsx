"use client";

import { useEffect } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import Badge from "../../../components/ui/Badge";
import SectionHeading from "../../../components/ui/SectionHeading";
import { bookings } from "../../../lib/mock-data";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../lib/redux-store";
   import {
     isClosed, money, orderStages, restoreOrders, statusLabel,
     statusProgress, useOrders, vehicleName,
   } from "../../../lib/orders";

export default function ManagerDashboard() {
  const sub = useOwnerSubscription();
  const allStaff = useAppSelector((s) => s.staff);
  const allOrders = useOrders();

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  const team = allStaff.filter((m) => m.tenantId === sub?.tenant.id);
  const activeStaff = team.filter((m) => m.status === "Active");

   const orders = allOrders.filter((o) => !o.tenantId || o.tenantId === sub?.tenant.id);  const open = orders.filter((o) => !isClosed(o.status));
  const unassigned = open.filter((o) => !o.assignedStaffId);
  const completed = orders.filter((o) => o.status === "completed");

  const staffName = (id: string) =>
    team.find((m) => m.id === id)?.name ?? "Unavailable";

  return (
    <>
      <Topbar
        title="Service Centre Dashboard"
        subtitle="Today’s workshop operations at a glance"
      />

      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard icon="calendar" label="Total orders" value={String(orders.length)} />
          <KpiCard icon="clock" label="Need a staff member" value={String(unassigned.length)} />
          <KpiCard icon="users" label="Active staff" value={String(activeStaff.length)} />
          <KpiCard icon="check" label="Completed" value={String(completed.length)} />
        </div>

        <section className="card p-6">
          <SectionHeading
            eyebrow="Operations"
            title="Order board"
            description="Open an order to assign staff and move it forward."
          />

          <div className="grid gap-4 xl:grid-cols-4">
            {orderStages.map((stage) => {
              const list = orders.filter((o) => stage.statuses.includes(o.status));
              return (
                <div key={stage.title} className="rounded-2xl bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <b>{stage.title}</b>
                    <Badge tone={list.length ? "yellow" : "gray"}>{list.length}</Badge>
                  </div>

                  {list.length === 0 && (
                    <p className="muted px-1 py-3 text-xs">No orders here.</p>
                  )}

                  {list.map((o) => (
                    <Link
                      key={o.id}
                      href={`/manager/bookings/${o.id}`}
                      className="mb-3 block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1"
                    >
                      <div className="flex justify-between">
                        <b>{o.id}</b>
                        <span className="text-xs text-slate-400">{money(o.amount)}</span>
                      </div>
                      <p className="mt-2 font-semibold">{vehicleName(o)}</p>
                      <p className="muted text-xs">
                        {o.service} · {statusLabel(o.status)}
                      </p>
                      <div className="mt-2 text-xs">
                        {o.assignedStaffId ? (
                          <span className="font-semibold">{staffName(o.assignedStaffId)}</span>
                        ) : (
                          <Badge tone="red">Unassigned</Badge>
                        )}
                      </div>
                      <div className="mt-3 progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.max(8, statusProgress(o.status))}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}