"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  KeyRound,
  Phone,
  ShieldCheck,
} from "lucide-react";

import Topbar from "../../../../components/navbar/Topbar";
import Badge from "../../../../components/ui/Badge";

import { useCustomerOrders } from "../../../../lib/customerOrders";
import { useAppSelector } from "../../../../lib/redux-store";

import ReviewCard from "@/components/customer/ReviewCard";

import {
  changeOrderStatus,
  formatOrderTime,
  isClosed,
  money,
  statusLabel,
  statusProgress,
  statusTone,
  vehicleName,
  verifyPickupOtp,
  formatTimeSlot,
} from "../../../../lib/orders";

import ProofSection from "../../../../components/orders/ProofSection";

export default function BookingTracking() {
  const { id } = useParams<{ id: string }>();

  const { orders } = useCustomerOrders();

  const staff = useAppSelector(
    (state) => state.staff,
  );

  const tenants = useAppSelector(
    (state) => state.tenants,
  );

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const order = orders.find(
    (item) => item.id === id,
  );

  if (!order) {
    return (
      <>
        <Topbar
          title="Booking not found"
          subtitle="This booking doesn't exist."
        />

        <div className="container md:!pl-6">
          <Link
            href="/customer/bookings"
            className="btn btn-secondary"
          >
            Back to bookings
          </Link>
        </div>
      </>
    );
  }

  const centre = tenants.find(
    (tenant) => tenant.id === order.tenantId,
  )?.name;

  const person = order.assignedStaffId
    ? staff.find(
        (member) => member.id === order.assignedStaffId,
      )
    : undefined;

  const history = [...order.history].reverse();

  const canCancel =
    order.status === "pending" ||
    order.status === "driver_assigned";

  const wasAccepted = order.history.some(
    (event) =>
      event.text === "Booking request accepted",
  );

  const submitOtp = (event: React.FormEvent) => {
    event.preventDefault();

    const result = verifyPickupOtp(
      order.id,
      code,
    );

    if (result.ok) {
      setCode("");
      setError("");
    } else {
      setError(result.error);
    }
  };

  const cancel = () => {
    if (window.confirm("Cancel this booking?")) {
      changeOrderStatus(
        order.id,
        order.status,
        "cancelled",
      );
    }
  };

  return (
    <>
      <Topbar
        title={`Booking ${order.id}`}
        subtitle={`${vehicleName(order)} · ${order.service}`}
      />

      <div className="container space-y-5 md:!pl-6">

        <Link
          href="/customer/bookings"
          className="btn btn-secondary"
        >
          ← My bookings
        </Link>

        {/* BOOKING INFORMATION */}

        <section className="card space-y-4 p-6">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>{centre ?? "Service centre"}</b>

            <Badge tone={statusTone(order.status)}>
              {order.status === "requested"
                ? "Requested"
                : order.status === "rejected"
                  ? "Rejected"
                  : wasAccepted
                    ? "Accepted"
                    : statusLabel(order.status)}
            </Badge>
          </div>

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

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <dt className="muted text-xs">Date</dt>
              <dd className="font-semibold">
                {order.date}
              </dd>
            </div>

            <div>
              <dt className="muted text-xs">
                Preferred time slot
              </dt>
              <dd className="font-semibold">
                {formatTimeSlot(order.timeSlot) || "—"}
              </dd>
            </div>

            <div>
              <dt className="muted text-xs">Amount</dt>
              <dd className="font-semibold">
                {order.amount > 0
                  ? money(order.amount)
                  : "To be confirmed"}
              </dd>
            </div>

            <div>
              <dt className="muted text-xs">
                Pickup address
              </dt>
              <dd className="font-semibold">
                {order.pickup?.address ?? "—"}
              </dd>
            </div>

          </dl>
        </section>

        {/* REQUESTED */}

        {order.status === "requested" && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-black text-amber-900">
              Waiting for the centre’s response
            </h2>

            <p className="mt-1 text-sm text-amber-800">
              Your booking request has been sent.
              The service centre has not accepted or
              rejected it yet.
            </p>
          </section>
        )}

        {/* ACCEPTED */}

        {wasAccepted && order.status !== "rejected" && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">

            <h2 className="font-black text-emerald-900">
              Booking accepted
            </h2>

            <p className="mt-1 text-sm text-emerald-800">
              Your service centre accepted this booking
              request. You can follow the normal order
              updates below.
            </p>

            {order.respondedBy && order.respondedAt && (
              <p className="mt-2 text-xs text-emerald-700">
                Accepted by {order.respondedBy.name} ·{" "}
                {formatOrderTime(order.respondedAt)}
              </p>
            )}

          </section>
        )}

        {/* REJECTED */}

        {order.status === "rejected" && (
          <section className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-5">

            <h2 className="font-black text-rose-900">
              Booking request rejected
            </h2>

            <p className="text-sm text-rose-800">
              {order.rejectionReply ||
                "The service centre rejected this request."}
            </p>

            {order.respondedBy && order.respondedAt && (
              <p className="text-xs text-rose-700">
                Replied by {order.respondedBy.name} ·{" "}
                {formatOrderTime(order.respondedAt)}
              </p>
            )}

            <Link
              href="/customer/bookings/new"
              className="inline-flex rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800"
            >
              Book another service
            </Link>

          </section>
        )}

        {/* ASSIGNED STAFF */}

        {person && !isClosed(order.status) && (
          <section className="card flex flex-wrap items-center justify-between gap-3 p-6">

            <div>
              <p className="muted text-xs">
                Your pickup person
              </p>

              <p className="text-lg font-black">
                {person.name}
              </p>
            </div>

            <a
              href={`tel:${person.mobile}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Phone size={16} />
              {person.mobile}
            </a>

          </section>
        )}

        {/* PICKUP OTP */}

        {order.status === "driver_assigned" && (
          <section className="card space-y-4 border-orange-200 p-6">

            <div className="flex items-start gap-3">

              <ShieldCheck className="mt-0.5 shrink-0 text-orange-500" />

              <div>
                <h2 className="font-black text-slate-900">
                  Verify before you hand over your vehicle
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Ask the staff member for the 4-digit OTP
                  shown in their app. Enter it here.
                  Hand over the vehicle only if it is accepted.
                </p>
              </div>

            </div>

            <form
              onSubmit={submitOtp}
              className="flex flex-wrap items-start gap-3"
            >

              <div>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  aria-label="Pickup OTP"
                  value={code}
                  onChange={(event) => {
                    setCode(
                      event.target.value.replace(/\D/g, ""),
                    );

                    setError("");
                  }}
                  className="input w-40 text-center text-xl font-black tracking-[.4em]"
                  placeholder="••••"
                />

                {error && (
                  <p
                    role="alert"
                    className="mt-2 text-xs font-semibold text-rose-600"
                  >
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={code.length !== 4}
                className="btn btn-primary"
              >
                <KeyRound size={16} />
                Verify OTP
              </button>

            </form>
          </section>
        )}

        {/* PICKUP VERIFIED */}

        {order.status === "pickup_otp_verified" && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Pickup verified. Your vehicle is with our
            staff and on its way to the centre.
          </p>
        )}

        {/* DELIVERY OTP */}

        {order.status === "ready_for_delivery" &&
          order.deliveryOtp && (
            <section className="card space-y-3 border-emerald-200 p-6 text-center">

              <h2 className="font-black text-slate-900">
                Your vehicle is ready for delivery
              </h2>

              <p className="text-sm text-slate-600">
                Tell this OTP to the staff member when
                they hand your vehicle back. Do not share
                it before that.
              </p>

              <p className="text-5xl font-black tracking-[.3em] text-slate-900">
                {order.deliveryOtp}
              </p>

            </section>
          )}

        {/* CANCEL */}

        {canCancel && (
          <button
            type="button"
            onClick={cancel}
            className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
          >
            Cancel booking
          </button>
        )}

        {/* EXISTING FEATURES */}

        <ProofSection order={order} />

        <ReviewCard order={order} />

        {/* ORDER HISTORY */}

        <section className="card p-6">

          <b>Updates</b>

          <ol className="mt-4 space-y-4">

            {history.map((event, index) => (
              <li
                key={index}
                className="border-l-2 border-slate-200 pl-4 text-sm"
              >
                <p className="font-semibold">
                  {event.text}
                </p>

                <p className="muted text-xs">
                  {formatOrderTime(event.at)}
                </p>
              </li>
            ))}

          </ol>

        </section>

      </div>
    </>
  );
}