"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import { useStaffWorkspace } from "../../../lib/staffSession";
import { isClosed, money, statusLabel, statusTone, vehicleName, type Order } from "../../../lib/orders";

type Filter = "all" | "open" | "completed" | "cancelled";
const tabs: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Incomplete" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const inFilter = (o: Order, f: Filter) =>
  f === "all" ? true : f === "open" ? !isClosed(o.status) : o.status === f;

export default function StaffOrders() {
  const { orders } = useStaffWorkspace();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = orders.filter(
    (o) =>
      inFilter(o, filter) &&
      (!q || [o.id, o.customer.name, o.customer.mobile, o.vehicle.registrationNo, vehicleName(o)].some((v) => v.toLowerCase().includes(q))),
  );

  return (
    <>
      <Topbar title="My Orders" subtitle="Only the orders assigned to you" />
      <div className="container space-y-4">
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
          <input
            aria-label="Search orders"
            className="input max-w-xs"
            placeholder="Search order, customer, vehicle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <DataTable
          headers={["Booking", "Customer", "Vehicle & service", "Pickup", "Amount", "Status", ""]}
          rows={shown.map((o) => [
            <div key="id">
              <Link href={`/staff/orders/${o.id}`} className="font-bold hover:underline">{o.id}</Link>
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
            <p key="p" className="max-w-[220px] truncate text-xs text-slate-600" title={o.pickup?.address}>
              {o.pickup?.address ?? "—"}
            </p>,
            money(o.amount),
            <Badge key="s" tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge>,
            <Link key="d" href={`/staff/orders/${o.id}`} className="text-xs font-bold text-orange-600 hover:underline">
              Details
            </Link>,
          ])}
        />
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            {orders.length === 0 ? "No orders have been assigned to you yet." : "No orders match this filter."}
          </p>
        )}
      </div>
    </>
  );
}