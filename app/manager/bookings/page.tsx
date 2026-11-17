"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";

import Topbar from "../../../components/navbar/Topbar";
import DataTable, { downloadCsv } from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";

import AssignStaffSelect from "../../../components/manager/AssignStaffSelect";
import OrderStatusSelect from "../../../components/manager/OrderStatusSelect";

import { useOwnerSubscription } from "../../../lib/ownerTenant";

import {
  restoreStaff,
  useAppSelector,
} from "../../../lib/redux-store";

import {
  inOrderTab,
  orderTabs,
} from "../../../lib/orderTabs";

import {
  assignOrder,
  changeOrderStatus,
  forTenant,
  formatTimeSlot,
  isClosed,
  money,
  restoreOrders,
  statusLabel,
  statusTone,
  useOrders,
  vehicleName,
  type Order,
} from "../../../lib/orders";

export default function ManagerBookings() {
  const sub = useOwnerSubscription();

  const allStaff = useAppSelector(
    (state) => state.staff,
  );

  const allOrders = useOrders();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  const orders = forTenant(
    allOrders,
    sub?.tenant.id,
  );

  // Booking requests are answered on the Dashboard.
  // An accepted request becomes a normal order and shows up here.
  const normalOrders = orders.filter(
    (order) => order.status !== "requested",
  );

  // Active staff belonging to this centre.
  const staff = allStaff.filter(
    (member) =>
      member.tenantId === sub?.tenant.id &&
      member.role === "staff" &&
      member.status === "Active",
  );

  const staffName = (id?: string) =>
    id
      ? (allStaff.find((member) => member.id === id)?.name ?? "")
      : "";

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
      staffName(order.assignedStaffId),
      order.createdBy.name,
      order.supervisedBy ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);

  // The selected tab and the search work together.
  const shown = normalOrders.filter(
    (order) =>
      inOrderTab(order, filter) && matchesSearch(order),
  );

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
        staffName(order.assignedStaffId),
        order.createdBy.name,
        order.supervisedBy ?? "",
      ]),
    );
  };

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
    const member = staff.find(
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

  return (
    <>
      <Topbar
        title="Orders"
        subtitle="Create orders, assign staff and track every booking"
      />

      <div className="container space-y-7">

        <section className="space-y-5">

          {staff.length === 0 && (
            <p
              role="status"
              className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800"
            >
              No active staff yet. Add staff from the{" "}
              <Link
                href="/manager/team"
                className="underline"
              >
                Team
              </Link>{" "}
              page.
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
                maxLength={42}
                aria-label="Search orders"
                className="input w-full !pl-9"
                placeholder="Search orders…"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
              />
            </label>

            <div className="ml-auto flex items-center gap-2">

              <Link
                href="/manager/bookings/new"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold !text-white"
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

          {/* ORDER FILTERS */}

          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Order filters"
          >

            {orderTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={filter === tab.value}
                onClick={() => setFilter(tab.value)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filter === tab.value
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}

                <span className="opacity-70">
                  {" "}
                  {
                    normalOrders.filter((order) =>
                      inOrderTab(order, tab.value),
                    ).length
                  }
                </span>

              </button>
            ))}

          </div>

          {/* ALL ORDERS TABLE */}

          <DataTable
            toolbar={false}
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
            rows={shown.map((order) => [
              <div key="id">

                <Link
                  href={`/manager/bookings/${order.id}`}
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

              <AssignStaffSelect
                key="a"
                staff={staff}
                value={order.assignedStaffId}
                disabled={isClosed(order.status)}
                onChange={(staffId) =>
                  assign(
                    order.id,
                    order.status,
                    staffId,
                  )
                }
              />,

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

              </div>,
            ])}
          />

          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {q
                ? "No orders match your search."
                : "No orders to show in this section."}
            </p>
          )}

        </section>

      </div>
    </>
  );
}