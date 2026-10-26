"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../lib/redux-store";
import {
  forTenant,
  isClosed,
  money,
  restoreOrders,
  statusLabel,
  statusTone,
  useOrders,
  vehicleName,
  type Order,
} from "../../../lib/orders";

type Filter = "all" | "open" | "completed" | "cancelled";

const tabs: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const inFilter = (o: Order, f: Filter) =>
  f === "all" ? true : f === "open" ? !isClosed(o.status) : o.status === f;

export default function OwnerOrders() {
  const sub = useOwnerSubscription();
  const tenantId = sub?.tenant.id;
  const allStaff = useAppSelector((s) => s.staff);
  const orders = forTenant(useOrders(), tenantId);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  const team = allStaff.filter((m) => m.tenantId === tenantId);
  const staffName = (id?: string) =>
    id ? (team.find((m) => m.id === id)?.name ?? "Unavailable") : "—";

  const q = query.trim().toLowerCase();
  const shown = orders.filter(
    (o) =>
      inFilter(o, filter) &&
      (!q ||
        [o.id, o.customer.name, o.customer.mobile, o.vehicle.registrationNo, vehicleName(o)].some((v) =>
          v.toLowerCase().includes(q),
        )),
  );

  // who is doing what (matched by name for now; the backend will use ids)
  const activity = team.map((m) => {
    const isManager = m.role === "Manager";
    const open = orders.filter(
      (o) => !isClosed(o.status) && (isManager ? o.supervisedBy === m.name : o.assignedStaffId === m.id),
    ).length;
    const done = orders.filter(
      (o) =>
        o.status === "completed" &&
        (isManager ? o.completedBy?.name === m.name : o.assignedStaffId === m.id),
    ).length;
    return { m, open, done };
  });

  return (
    <>
      <Topbar title="Orders" subtitle="Every order at your service centre and who handled it" />
      <div className="container space-y-7">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Order filters">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={filter === t.value}
                  onClick={() => setFilter(t.value)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filter === t.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.label} <span className="opacity-70">{orders.filter((o) => inFilter(o, t.value)).length}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Search orders"
                className="input max-w-xs"
                placeholder="Search order, customer, vehicle…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Link href="/owner/allorders/new" className="btn btn-primary">
                + Add order
              </Link>
            </div>
          </div>

          <DataTable
            headers={["Booking", "Customer", "Vehicle & service", "Amount", "Status", "Assigned to", "Handled by"]}
            rows={shown.map((o) => [
              <div key="id">
                <Link href={`/owner/allorders/${o.id}`} className="font-bold hover:underline">
                  {o.id}
                </Link>
                <p className="muted text-xs">{o.date}</p>
              </div>,
              <div key="c">
                <p className="font-semibold">{o.customer.name}</p>
                <p className="muted text-xs">{o.customer.mobile}</p>
              </div>,
              <div key="v">
                <p className="font-semibold">{vehicleName(o)}</p>
                <p className="muted text-xs">{o.service}</p>
              </div>,
              money(o.amount),
              <Badge key="s" tone={statusTone(o.status)}>
                {statusLabel(o.status)}
              </Badge>,
              staffName(o.assignedStaffId),
              <div key="m" className="text-xs">
                <p>Created: <b>{o.createdBy.name}</b></p>
                <p className="muted">Supervised: {o.supervisedBy ?? "—"}</p>
                {o.completedBy && <p className="muted">Completed: {o.completedBy.name}</p>}
              </div>,
            ])}
          />
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {orders.length === 0 ? "No orders yet." : "No orders match this filter."}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Team activity</h2>
            <p className="text-sm text-slate-500">Open = orders in progress now. Completed = orders finished.</p>
          </div>
          <DataTable
            headers={["Person", "Role", "Open orders", "Completed"]}
            rows={activity.map(({ m, open, done }) => [
              <b key="n">{m.name}</b>,
              m.role === "Driver" ? "Staff / Driver" : "Manager",
              String(open),
              String(done),
            ])}
          />
          {activity.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              No team yet. Add managers and staff from My Staff.
            </p>
          )}
        </section>
      </div>
    </>
  );
}