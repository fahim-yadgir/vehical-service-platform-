"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";

import Topbar from "../../../components/navbar/Topbar";
import DataTable, { downloadCsv } from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";

import AssignStaffSelect from "../../../components/manager/AssignStaffSelect";
import OrderStatusSelect from "../../../components/manager/OrderStatusSelect";

import BookingRequests from "../../../components/orders/BookingRequests";

import { useOwnerSubscription } from "../../../lib/ownerTenant";

import {
  restoreStaff,
  useAppSelector,
} from "../../../lib/redux-store";

import {
  acceptOrderRequest,
  assignOrder,
  changeOrderStatus,
  forTenant,
  isClosed,
  money,
  rejectOrderRequest,
  restoreOrders,
  statusLabel,
  statusTone,
  useOrders,
  vehicleName,
  type Order,
  formatTimeSlot,
} from "../../../lib/orders";

// The Booking requests button is not an order status, it shows the request cards instead of the table.
const REQUESTS = "requests";

const tabs: {
  value: string;
  label: string;
  statuses?: string[];
}[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pickup",
    label: "New & pickup",
    statuses: [
      "pending",
      "driver_assigned",
      "pickup_otp_verified",
      "in_transit",
    ],
  },
  {
    value: "at_centre",
    label: "Reached at centre",
    statuses: ["at_centre"],
  },
  {
    value: "working",
    label: "Working",
    statuses: [
      "inspection",
      "repair_in_progress",
      "quality_check",
    ],
  },
  {
    value: "delivery",
    label: "Delivery ready",
    statuses: [
      "ready_for_delivery",
      "delivery_otp_verified",
    ],
  },
  {
    value: "completed",
    label: "Completed",
    statuses: ["completed"],
  },
  {
    value: "cancelled",
    label: "Cancelled",
    statuses: ["cancelled"],
  },
  {
    value: "rejected",
    label: "Rejected",
    statuses: ["rejected"],
  },
];

const inFilter = (
  order: Order,
  filter: string,
) => {
  const statuses = tabs.find(
    (tab) => tab.value === filter,
  )?.statuses;

  return !statuses || statuses.includes(order.status);
};

export default function OwnerOrders() {
  const sub = useOwnerSubscription();

  const tenantId = sub?.tenant.id;

  const allStaff = useAppSelector(
    (state) => state.staff,
  );

  const orders = forTenant(
    useOrders(),
    tenantId,
  );

  const [filter, setFilter] = useState("all");

  const [query, setQuery] = useState("");

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  // Customer requests waiting for approval.
  const requests = orders.filter(
    (order) => order.status === "requested",
  );

  // Requests are not orders until they are accepted.
  const normalOrders = orders.filter(
    (order) => order.status !== "requested",
  );

  const team = allStaff.filter(
    (member) => member.tenantId === tenantId,
  );

  const assignable = team.filter(
    (member) =>
      member.role === "staff" &&
      member.status === "Active",
  );

  const staffName = (id?: string) =>
    id
      ? team.find((member) => member.id === id)?.name ??
        "Unavailable"
      : "—";

  const changeStatus = (
    id: string,
    from: string,
    to: string,
  ) => {
    if (
      to === "cancelled" &&
      !window.confirm("Cancel this booking?")
    ) {
      return;
    }

    changeOrderStatus(id, from, to);
  };

  const assign = (
    id: string,
    status: string,
    staffId: string,
  ) => {
    const member = assignable.find(
      (item) => item.id === staffId,
    );

    if (member) {
      assignOrder(
        id,
        status,
        staffId,
        member.name,
      );
    }
  };

  const accept = (id: string) => {
    if (
      window.confirm("Accept this booking request?")
    ) {
      acceptOrderRequest(id);
    }
  };

  const reject = (
    id: string,
    reply: string,
  ) => {
    rejectOrderRequest(id, reply);
  };

  const q = query.trim().toLowerCase();

  const matchesSearch = (order: Order) =>
    !q ||
    [
      order.id,
      order.customer.name,
      order.customer.mobile,
      vehicleName(order),
      order.vehicle.registrationNo,
      order.service,
      statusLabel(order.status),
      order.date,
      formatTimeSlot(order.timeSlot),
      team.find((member) => member.id === order.assignedStaffId)
        ?.name ?? "",
      order.createdBy.name,
      order.supervisedBy ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);

  // The selected button and the search work together.
  const shown =
    filter === REQUESTS
      ? []
      : normalOrders.filter(
          (order) =>
            inFilter(order, filter) && matchesSearch(order),
        );

  const shownRequests = requests.filter(matchesSearch);

  const buttons = [
    { value: REQUESTS, label: "Booking requests" },
    ...tabs,
  ];

  const countOf = (value: string) =>
    value === REQUESTS
      ? requests.length
      : normalOrders.filter((order) =>
          inFilter(order, value),
        ).length;

  const exportOrders = () => {
    downloadCsv(
      "orders",
      [
        "Booking",
        "Date",
        "Time",
        "Customer",
        "Mobile",
        "Vehicle",
        "Registration",
        "Service",
        "Amount",
        "Status",
        "Assigned to",
        "Created by",
        "Supervised by",
      ],
      shown.map((order) => [
        order.id,
        order.date,
        formatTimeSlot(order.timeSlot),
        order.customer.name,
        order.customer.mobile,
        vehicleName(order),
        order.vehicle.registrationNo,
        order.service,
        String(order.amount),
        statusLabel(order.status),
        order.assignedStaffId
          ? staffName(order.assignedStaffId)
          : "",
        order.createdBy.name,
        order.supervisedBy ?? "",
      ]),
    );
  };

  return (
    <>
      <Topbar
        title="Orders"
        subtitle="Manage every order at your service centre"
      />

      <div className="container space-y-7">

        <section className="space-y-5">

          {/* NO STAFF WARNING */}

          {assignable.length === 0 && (
            <p
              role="status"
              className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800"
            >
              No active staff to assign. Add staff from{" "}
              <Link
                href="/owner/mystaff"
                className="underline"
              >
                My Staff
              </Link>
              .
            </p>
          )}

          {/* SEARCH, ADD ORDER AND EXPORT */}

          <div className="flex flex-wrap items-center gap-2">

            <label className="relative block min-w-[220px] flex-1 sm:max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              />

              <input
  type="text"
  maxLength={42}
  aria-label="Search orders"
  className="input w-full !pl-9"
  placeholder="Search orders…"
  value={query}
  onChange={(event) => setQuery(event.target.value)}
/>
            </label>

            <div className="ml-auto flex items-center gap-2">

              <Link
                href="/owner/allorders/new"
                className="btn btn-primary"
              >
                + Add order
              </Link>

              <button
                type="button"
                onClick={exportOrders}
                disabled={shown.length === 0}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} aria-hidden /> Export
              </button>

            </div>

          </div>

          {/* BUTTONS: booking requests and order filters */}

          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Order filters"
          >

            {buttons.map((tab) => {
              const count = countOf(tab.value);
              const waiting = tab.value === REQUESTS && count > 0;

              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={filter === tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filter === tab.value
                      ? "bg-orange-50 text-orange-700"
                      : waiting
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}

                  <span className="opacity-70">
                    {" "}
                    {count}
                  </span>

                </button>
              );
            })}

          </div>

          {filter === REQUESTS ? (

            /* BOOKING REQUESTS */

            <BookingRequests
              requests={shownRequests}
              onAccept={accept}
              onReject={reject}
            />

          ) : (
            <>

              {/* ORDERS TABLE */}

              <DataTable
                key={filter}
                toolbar={false}
                plainColumns={[
                  "Assigned to",
                  "Change status",
                ]}
                headers={[
                  "Booking",
                  "Customer",
                  "Vehicle & service",
                  "Amount",
                  "Status",
                  "Assigned to",
                  "Change status",
                  "Handled by",
                ]}
                rows={shown.map((order) => [
                  <div key="id">

                    <Link
                      href={`/owner/allorders/${order.id}`}
                      className="font-bold hover:underline"
                    >
                      {order.id}
                    </Link>

                    <p className="muted text-xs">
                      {order.date}
                      {order.timeSlot
                        ? ` · ${formatTimeSlot(order.timeSlot)}`
                        : ""}
                    </p>

                  </div>,

                  <div key="c">

                    <p className="font-semibold">
                      {order.customer.name}
                    </p>

                    <p className="muted text-xs">
                      {order.customer.mobile}
                    </p>

                  </div>,

                  <div key="v">

                    <p className="font-semibold">
                      {vehicleName(order)}
                    </p>

                    <p className="muted text-xs">
                      {order.service}
                    </p>

                  </div>,

                  money(order.amount),

                  <Badge
                    key="s"
                    tone={statusTone(order.status)}
                  >
                    {statusLabel(order.status)}
                  </Badge>,

                  isClosed(order.status) ? (
                    <span key="a" className="text-sm">
                      {staffName(order.assignedStaffId)}
                    </span>
                  ) : (
                    <AssignStaffSelect
                      key="a"
                      staff={assignable}
                      value={order.assignedStaffId}
                      onChange={(staffId) =>
                        assign(
                          order.id,
                          order.status,
                          staffId,
                        )
                      }
                    />
                  ),

                  <OrderStatusSelect
                    key="x"
                    status={order.status}
                    onChange={(next) =>
                      changeStatus(
                        order.id,
                        order.status,
                        next,
                      )
                    }
                  />,

                  <div key="m" className="text-xs">

                    <p>
                      Created:{" "}
                      <b>{order.createdBy.name}</b>
                    </p>

                    <p className="muted">
                      Supervised: {order.supervisedBy ?? "—"}
                    </p>

                    {order.completedBy && (
                      <p className="muted">
                        Completed: {order.completedBy.name}
                      </p>
                    )}

                    {order.respondedBy && (
                      <p className="muted">
                        Response: {order.respondedBy.name}
                      </p>
                    )}

                  </div>,
                ])}
              />

              {shown.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  {normalOrders.length === 0
                    ? "No orders yet."
                    : q
                      ? "No orders match your search."
                      : "No orders match this filter."}
                </p>
              )}

            </>
          )}

        </section>

      </div>
    </>
  );
}