"use client";

import { useState } from "react";

import Badge from "../ui/Badge";

import {
  money,
  statusLabel,
  statusTone,
  vehicleName,
  type Order,
  formatTimeSlot,
} from "../../lib/orders";

type Props = {
  requests: Order[];

  onAccept: (id: string) => void;

  onReject: (
    id: string,
    reply: string,
  ) => void;
};

export default function BookingRequests({
  requests,
  onAccept,
  onReject,
}: Props) {
  const [rejectingId, setRejectingId] =
    useState<string | null>(null);

  const [reply, setReply] = useState("");

  const [error, setError] = useState("");

  const openReject = (id: string) => {
    setRejectingId(id);
    setReply("");
    setError("");
  };

  const submitReject = (id: string) => {
    if (!reply.trim()) {
      setError(
        "Please enter a reply before rejecting this request.",
      );
      return;
    }

    onReject(id, reply.trim());

    setRejectingId(null);
    setReply("");
    setError("");
  };

  return (
    <section className="space-y-4">

      <div className="flex items-center justify-between gap-3">

        <div>
          <h2 className="text-lg font-black text-slate-900">
            Booking requests
          </h2>

          <p className="muted text-sm">
            Review customer bookings before they become orders.
          </p>
        </div>

        <Badge tone={requests.length ? "yellow" : "gray"}>
          {requests.length} pending
        </Badge>

      </div>

      {requests.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          No pending booking requests.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">

          {requests.map((order) => (
            <article
              key={order.id}
              className="card space-y-4 p-5"
            >

              <div className="flex flex-wrap items-start justify-between gap-2">

                <div>
                  <p className="font-black">
                    {order.id}
                  </p>

                  <p className="muted text-xs">
                    Requested by {order.customer.name}
                  </p>
                </div>

                <Badge tone={statusTone(order.status)}>
                  {statusLabel(order.status)}
                </Badge>

              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">

                <div>
                  <p className="muted text-xs">
                    Customer
                  </p>

                  <p className="font-semibold">
                    {order.customer.name}
                  </p>

                  <p className="muted">
                    {order.customer.mobile}
                  </p>
                </div>

                <div>
                  <p className="muted text-xs">
                    Vehicle
                  </p>

                  <p className="font-semibold">
                    {vehicleName(order)}
                  </p>

                  <p className="muted">
                    {order.vehicle.registrationNo}
                  </p>
                </div>

                <div>
                  <p className="muted text-xs">
                    Service
                  </p>

                  <p className="font-semibold">
                    {order.service}
                  </p>
                </div>

                <div>
                  <p className="muted text-xs">
                    Preferred date and slot
                  </p>

                  <p className="font-semibold">
                    {order.date}
                  </p>

                  <p className="muted">
                    {formatTimeSlot(order.timeSlot) || "Not specified"}
                  </p>
                </div>

              </div>

              {order.notes && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">

                  <p className="muted mb-1 text-xs">
                    Customer notes
                  </p>

                  {order.notes}

                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">

                <p className="font-bold">
                  {order.amount > 0
                    ? money(order.amount)
                    : "Price to be confirmed"}
                </p>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() => openReject(order.id)}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => onAccept(order.id)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Accept
                  </button>

                </div>

              </div>

              {/* REJECTION REPLY BOX */}

              {rejectingId === order.id && (
                <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4">

                  <label className="block space-y-2">

                    <span className="text-sm font-bold text-slate-800">
                      Reply to customer (required)
                    </span>

                    <textarea
                      className="input min-h-24 w-full resize-y"
                      maxLength={500}
                      value={reply}
                      onChange={(event) => {
                        setReply(event.target.value);
                        setError("");
                      }}
                      placeholder="e.g. Sorry, no staff available for this time slot."
                    />

                  </label>

                  {error && (
                    <p
                      role="alert"
                      className="text-xs font-semibold text-rose-700"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">

                    <button
                      type="button"
                      onClick={() => setRejectingId(null)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => submitReject(order.id)}
                      disabled={!reply.trim()}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirm rejection
                    </button>

                  </div>

                </div>
              )}

            </article>
          ))}

        </div>
      )}

    </section>
  );
}