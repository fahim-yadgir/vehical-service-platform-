"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import CreateOrder from "../../../components/owner/CreateOrder";
import ViewOrderDetail from "../../../components/owner/ViewOrderDetail";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { rateDisplayName, useOwnerRates } from "../../../lib/ownerRates";
import { serviceOptions } from "../../../lib/serviceCenters";
import { restoreStaff, useAppSelector } from "../../../lib/redux-store";
import { appointStaff, changeStatus, fmtDate, inr, itemsSummary, needsStaff, ORDER_STATUSES, orderTotal, ordersPerCustomer, useTenantOrders, type NewOrder, type OrderStatus } from "../../../lib/orders";

type Filter = "all" | OrderStatus;
const tone: Record<OrderStatus, "blue" | "yellow" | "green" | "red"> = { New: "blue", Assigned: "yellow", "In Progress": "yellow", Completed: "green", Cancelled: "red" };

export default function AllOrders() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const { orders, loaded, create, update } = useTenantOrders(tenant?.id);
  const { rates } = useOwnerRates(tenant?.id);
  const allStaff = useAppSelector((s) => s.staff);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => restoreStaff(), []);

  // Lets other pages open an order directly, e.g. the dashboard: /owner/allorders?order=ORD1001
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    if (id) setOpenId(id);
  }, []);

  const staff = allStaff.filter((m) => m.tenantId === tenant?.id);
  const activeStaff = staff.filter((m) => m.status === "Active");
  const staffName = (id?: string) => staff.find((m) => m.id === id)?.name;
  const perCustomer = useMemo(() => ordersPerCustomer(orders), [orders]);
  const opened = orders.find((o) => o.id === openId) ?? null;

  const count = (f: Filter) => (f === "all" ? orders.length : orders.filter((o) => o.status === f).length);
  const q = query.trim().toLowerCase();
  const shown = orders.filter((o) => (filter === "all" || o.status === filter) && (!q || [o.id, o.customer, o.mobile, o.vehicle, ...o.items.map((i) => i.name)].some((v) => v.toLowerCase().includes(q))));
  const customers = Object.keys(perCustomer).length;

  function createOrder(data: NewOrder) {
    const created = create(data);
    setCreating(false);
    if (created) setNotice(`Order ${created.id} created${created.assignedTo ? ` and given to ${staffName(created.assignedTo) ?? "staff"}` : ". Open it to appoint staff"}.`);
  }

  return (
    <>
      <Topbar title="All Orders" subtitle="Every order from your customers. Open one to appoint staff." />
      <div className="container space-y-5">
        <div className="grid-auto">
          <KpiCard icon="calendar" label="Total orders" value={loaded ? orders.length : "—"} change={loaded ? `from ${customers} customer${customers === 1 ? "" : "s"}` : undefined} />
          <KpiCard icon="users" label="Need staff" value={loaded ? orders.filter(needsStaff).length : "—"} />
          <KpiCard icon="activity" label="In progress" value={loaded ? count("Assigned") + count("In Progress") : "—"} />
          <KpiCard icon="check" label="Completed" value={loaded ? count("Completed") : "—"} />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Order filters">
            {(["all", ...ORDER_STATUSES] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === f ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {f === "all" ? "All" : f} <span className="opacity-70">{loaded ? count(f) : 0}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, customer, mobile" aria-label="Search orders" className="input sm:w-64" />
            <Button onClick={() => setCreating(true)}>Create order</Button>
          </div>
        </div>

        {notice && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        <DataTable
          headers={["Order", "Customer", "Work", "Total", "Status", "Staff", "Action"]}
          rows={shown.map((o) => [
            <div key="o"><b>{o.id}</b><span className="muted block text-xs">{fmtDate(o.date)}</span></div>,
            <div key="c">
              <b>{o.customer}</b>
              <span className="muted block text-xs">{o.mobile}</span>
              <Badge tone="gray">{perCustomer[o.mobile]} order{perCustomer[o.mobile] === 1 ? "" : "s"}</Badge>
            </div>,
            <div key="w"><span className="block">{itemsSummary(o)}</span><span className="muted text-xs">{o.vehicle}</span></div>,
            <b key="t">{inr(orderTotal(o))}</b>,
            <Badge key="s" tone={tone[o.status]}>{o.status}</Badge>,
            o.assignedTo ? <span key="p">{staffName(o.assignedTo) ?? "Removed staff"}</span> : <span key="p" className="muted text-xs">{needsStaff(o) ? "Not appointed" : "—"}</span>,
            <button key="a" type="button" onClick={() => setOpenId(o.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{needsStaff(o) ? "Appoint staff" : "View"}</button>,
          ])}
        />
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            {orders.length === 0 ? "No orders yet. Customer orders will appear here. For a phone or walk-in customer, use Create order." : "No orders match this filter."}
          </p>
        )}
      </div>

      {creating && (
        <CreateOrder
          rates={rates?.services.map((s) => ({ name: rateDisplayName(s), price: s.price })) ?? []}
          suggestions={serviceOptions}
          staff={activeStaff}
          onCreate={createOrder}
          onClose={() => setCreating(false)}
        />
      )}

      {opened && (
        <ViewOrderDetail
          order={opened}
          customerOrders={perCustomer[opened.mobile] ?? 1}
          staff={staff}
          onAppoint={(staffId) => {
            update(appointStaff(opened, staffId));
            setNotice(staffId ? `${staffName(staffId) ?? "Staff"} appointed for ${opened.id}.` : `Staff removed from ${opened.id}.`);
          }}
          onStatus={(status) => {
            const result = changeStatus(opened, status);
            if ("error" in result) return result.error;
            update(result.order);
            return null;
          }}
          onClose={() => {
            setOpenId(null);
            window.history.replaceState(null, "", "/owner/allorders");
          }}
        />
      )}
    </>
  );
}