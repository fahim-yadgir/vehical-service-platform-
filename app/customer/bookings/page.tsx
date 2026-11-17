"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import Topbar from "../../../components/navbar/Topbar";
import Badge from "../../../components/ui/Badge";

import { useCustomerOrders } from "../../../lib/customerOrders";
import { useAppSelector } from "../../../lib/redux-store";

import {
  money,
  statusLabel,
  statusProgress,
  statusTone,
  vehicleName,
  formatTimeSlot,
} from "../../../lib/orders";

export default function CustomerBookings() {
  const { orders } = useCustomerOrders();

  const tenants = useAppSelector(
    (state) => state.tenants,
  );

  return (
    <>
      <Topbar
        title="My Bookings"
        subtitle="Track every service booking"
      />

      <div className="container space-y-5 md:!pl-6">

        <div className="flex justify-end">
          <Link
            href="/customer/bookings/new"
            className="btn btn-primary"
          >
            <Plus size={16} />
            New booking
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="card py-12 text-center text-sm text-slate-500">
            No bookings yet. Book your first service.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">

            {orders.map((order) => {
              const wasAccepted = order.history.some(
                (event) =>
                  event.text === "Booking request accepted",
              );

              const displayStatus =
                order.status === "requested"
                  ? "Requested"
                  : order.status === "rejected"
                    ? "Rejected"
                    : wasAccepted
                      ? "Accepted"
                      : statusLabel(order.status);

              return (
                <Link
                  key={order.id}
                  href={`/customer/bookings/${order.id}`}
                  className="card block space-y-3 p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {order.id}
                      </p>

                      <p className="muted text-xs">
                        {order.date} ·{" "}
                        {tenants.find(
                          (tenant) =>
                            tenant.id === order.tenantId,
                        )?.name ?? "Service centre"}
                      </p>
                    </div>

                    <Badge tone={statusTone(order.status)}>
                      {displayStatus}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold">
                    {vehicleName(order)} · {order.service}
                  </p>

                  <p className="muted text-xs">
                    Preferred slot:{" "}
                    {formatTimeSlot(order.timeSlot) || "—"}
                  </p>

                  {order.status === "requested" && (
                    <p className="text-xs font-semibold text-amber-700">
                      Waiting for the centre’s response.
                    </p>
                  )}

                  {order.status === "rejected" &&
                    order.rejectionReply && (
                      <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
                        Centre reply: {order.rejectionReply}
                      </p>
                    )}

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(
                          8,
                          statusProgress(order.status),
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="text-sm font-bold">
                    {order.amount > 0
                      ? money(order.amount)
                      : "Price to be confirmed"}
                  </p>

                </Link>
              );
            })}

          </div>
        )}

      </div>
    </>
  );
}