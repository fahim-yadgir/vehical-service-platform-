"use client";

import type { ReactNode } from "react";
import Badge from "../ui/Badge";
import {
  formatOrderTime,
  money,
  statusLabel,
  statusProgress,
  statusTone,
  vehicleName,
  type Actor,
  type Order,
} from "../../lib/orders";

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

/** Full details of one order. Pass `actions` to show controls (manager); leave it out for a read-only view (owner). */
export default function OrderDetails({
  order,
  assignedName,
  actions,
}: {
  order: Order;
  assignedName?: string;
  actions?: ReactNode;
}) {
  const history = [...order.history].reverse(); // latest first

  return (
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
          {actions}
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
  );
}