"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import Badge from "../../../../components/ui/Badge";
import AssignStaffSelect from "../../../../components/manager/AssignStaffSelect";
import OrderStatusSelect from "../../../../components/manager/OrderStatusSelect";
import { useOwnerSubscription } from "../../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../../lib/redux-store";
import {
  assignOrder,
  changeOrderStatus,
  formatOrderTime,
  isClosed,
  money,
  restoreOrders,
  statusLabel,
  statusProgress,
  statusTone,
  useOrders,
  vehicleName,
  type Actor,
} from "../../../../lib/orders";

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt className="muted text-xs">{label}</dt>
      <dd className="font-semibold">{value || "—"}</dd>
    </div>
  );
}

const actorText = (a?: Actor) =>
  a ? `${a.name} (${a.role}) · ${formatOrderTime(a.at)}` : undefined;

export default function ManagerOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const sub = useOwnerSubscription();
  const allStaff = useAppSelector((s) => s.staff);
  const orders = useOrders();

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <>
        <Topbar title="Order not found" subtitle="This order doesn't exist." />
        <div className="container">
          <Link href="/manager/bookings" className="font-semibold underline">
            Back to orders
          </Link>
        </div>
      </>
    );
  }

  const team = allStaff.filter((m) => m.tenantId === sub?.tenant.id);
  const staff = team.filter((m) => m.role === "Driver" && m.status === "Active");
  const assignedName = order.assignedStaffId
    ? (team.find((m) => m.id === order.assignedStaffId)?.name ?? "Unavailable")
    : undefined;
  const history = [...order.history].reverse(); // latest first

  const assign = (staffId: string) => {
    const member = staff.find((m) => m.id === staffId);
    if (member) assignOrder(order.id, order.status, staffId, member.name);
  };

  const changeStatus = (next: string) => {
    if (next === "cancelled" && !window.confirm("Cancel this booking?")) return;
    changeOrderStatus(order.id, order.status, next);
  };

  return (
    <>
      <Topbar title={`Order ${order.id}`} subtitle={`${vehicleName(order)} · ${order.service}`} />

      <div className="container space-y-5">
        <Link href="/manager/bookings" className="text-sm font-semibold underline">
          ← Back to orders
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card space-y-5 p-6">
              <div className="flex items-center justify-between">
                <b>Status</b>
                <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(8, statusProgress(order.status))}%` }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="muted mb-1 block text-xs">Assigned to</span>
                  <AssignStaffSelect
                    staff={staff}
                    value={order.assignedStaffId}
                    disabled={isClosed(order.status)}
                    onChange={assign}
                  />
                </label>
                <label className="text-sm">
                  <span className="muted mb-1 block text-xs">Move order</span>
                  <OrderStatusSelect status={order.status} onChange={changeStatus} />
                </label>
              </div>
            </section>

            <section className="card p-6">
              <b>Customer</b>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Name" value={order.customer.name} />
                <Info label="Mobile" value={order.customer.mobile} />
              </dl>
            </section>

            <section className="card p-6">
              <b>Vehicle</b>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Type" value={order.vehicle.type} />
                <Info label="Brand & model" value={vehicleName(order)} />
                <Info label="Registration no." value={order.vehicle.registrationNo} />
                <Info label="Year" value={order.vehicle.year} />
              </dl>
            </section>

            <section className="card p-6">
              <b>Service & payment</b>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Service" value={order.service} />
                <Info label="Date" value={order.date} />
                <Info label="Amount" value={money(order.amount)} />
                <Info label="Notes" value={order.notes} />
              </dl>
            </section>
          </div>

          <div className="space-y-6">
            <section className="card p-6">
              <b>Who handled this order</b>
              <dl className="mt-4 space-y-4 text-sm">
                <Info label="Created by" value={actorText(order.createdBy)} />
                <Info label="Assigned staff" value={assignedName} />
                <Info label="Supervised by" value={order.supervisedBy} />
                <Info label="Completed by" value={actorText(order.completedBy)} />
              </dl>
            </section>

            <section className="card p-6">
              <b>History</b>
              <ol className="mt-4 space-y-4">
                {history.map((h, i) => (
                  <li key={i} className="border-l-2 border-slate-200 pl-4 text-sm">
                    <p className="font-semibold">{h.text}</p>
                    <p className="muted text-xs">
                      {h.by} ({h.role}) · {formatOrderTime(h.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}