"use client";

import { useEffect } from "react";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import BookingRequests from "../../../components/orders/BookingRequests";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../lib/redux-store";
import {
  acceptOrderRequest,
  forTenant,
  isClosed,
  rejectOrderRequest,
  restoreOrders,
  useOrders,
} from "../../../lib/orders";

export default function ManagerDashboard() {
  const sub = useOwnerSubscription();
  const allStaff = useAppSelector((s) => s.staff);
  const allOrders = useOrders();

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  const team = allStaff.filter((m) => m.tenantId === sub?.tenant.id);
  const activeStaff = team.filter((m) => m.status === "Active");

  const orders = forTenant(allOrders, sub?.tenant.id);

  // Customer bookings waiting for a reply. They are not orders until they are accepted.
  const requests = orders.filter((o) => o.status === "requested");
  const accepted = orders.filter((o) => o.status !== "requested");

  const open = accepted.filter((o) => !isClosed(o.status));
  const unassigned = open.filter((o) => !o.assignedStaffId);
  const completed = accepted.filter((o) => o.status === "completed");

  // Accepting moves the booking into the Orders page.
  const accept = (id: string) => {
    if (window.confirm("Accept this booking request?")) {
      acceptOrderRequest(id);
    }
  };

  const reject = (id: string, reply: string) => {
    rejectOrderRequest(id, reply);
  };

  return (
    <>
      <Topbar
        title="Service Centre Dashboard"
        subtitle="Booking requests and today’s workshop numbers at a glance"
      />

      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard icon="activity" label="New booking requests" value={String(requests.length)} />
          <KpiCard icon="calendar" label="Total orders" value={String(accepted.length)} />
          <KpiCard icon="clock" label="Need a staff member" value={String(unassigned.length)} />
          <KpiCard icon="users" label="Active staff" value={String(activeStaff.length)} />
          <KpiCard icon="check" label="Completed" value={String(completed.length)} />
        </div>

        <BookingRequests
          requests={requests}
          onAccept={accept}
          onReject={reject}
        />
      </div>
    </>
  );
}