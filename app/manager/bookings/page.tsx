"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import AssignStaffSelect from "../../../components/manager/AssignStaffSelect";
import OrderStatusSelect from "../../../components/manager/OrderStatusSelect";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../lib/redux-store";
import { inOrderTab, orderTabs } from "../../../lib/orderTabs";
import {
  assignOrder,
  changeOrderStatus,
  forTenant,
  isClosed,
  money,
  restoreOrders,
  statusLabel,
  statusTone,
  useOrders,
  vehicleName,
} from "../../../lib/orders";

export default function ManagerBookings() {
  const sub = useOwnerSubscription();
  const allStaff = useAppSelector((s) => s.staff);
  const allOrders = useOrders();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  const orders = forTenant(allOrders, sub?.tenant.id);
  const shown = orders.filter((o) => inOrderTab(o, filter));
  // only active staff of this manager's own service centre
  const staff = allStaff.filter(
    (m) => m.tenantId === sub?.tenant.id && m.role === "staff" && m.status === "Active",
  );

  const changeStatus = (id: string, from: string, to: string) => {
    if (to === "cancelled" && !window.confirm("Cancel this booking?")) return;
    changeOrderStatus(id, from, to);
  };

  const assign = (id: string, status: string, staffId: string) => {
    const member = staff.find((m) => m.id === staffId);
    if (member) assignOrder(id, status, staffId, member.name);
  };

  return (
    <>
      <Topbar title="Orders" subtitle="Create orders, assign staff and track every booking" />
      <div className="container space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {staff.length === 0 ? (
            <p role="status" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800">
              No active staff yet. Add staff from the{" "}
              <Link href="/manager/team" className="underline">Team</Link> page.
            </p>
          ) : (
            <span />
          )}
          <Link
            href="/manager/bookings/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold !text-white"
          >
            + Add order
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" aria-label="Order filters">
          {orderTabs.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={filter === t.value}
              onClick={() => setFilter(t.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                filter === t.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label} <span className="opacity-70">{orders.filter((o) => inOrderTab(o, t.value)).length}</span>
            </button>
          ))}
        </div>

        <DataTable
          headers={[
            "Booking",
            "Customer",
            "Vehicle & service",
            "Amount",
            "Status",
            "Assigned to",
            "Change status",
            "Managed by",
          ]}
          rows={shown.map((o) => [
            <div key="id">
              <Link href={`/manager/bookings/${o.id}`} className="font-bold hover:underline">
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
            <AssignStaffSelect
              key="a"
              staff={staff}
              value={o.assignedStaffId}
              disabled={isClosed(o.status)}
              onChange={(staffId) => assign(o.id, o.status, staffId)}
            />,
            <OrderStatusSelect
              key="x"
              status={o.status}
              onChange={(next) => changeStatus(o.id, o.status, next)}
            />,
            <div key="m" className="text-xs">
              <p>Created: <b>{o.createdBy.name}</b></p>
              <p className="muted">Supervised: {o.supervisedBy ?? "—"}</p>
            </div>,
          ])}
        />
      </div>
    </>
  );
}