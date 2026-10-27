"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import OrderDetails from "../../../../components/orders/OrderDetails";
import AssignStaffSelect from "../../../../components/manager/AssignStaffSelect";
import OrderStatusSelect from "../../../../components/manager/OrderStatusSelect";
import { useOwnerSubscription } from "../../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../../lib/redux-store";
import {
  assignOrder,
  changeOrderStatus,
  forTenant,
  isClosed,
  restoreOrders,
  useOrders,
  vehicleName,
} from "../../../../lib/orders";

export default function ManagerOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const sub = useOwnerSubscription();
  const allStaff = useAppSelector((s) => s.staff);
  const orders = forTenant(useOrders(), sub?.tenant.id);

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
          <Link href="/manager/bookings" className="btn btn-secondary">
            Back to orders
          </Link>
        </div>
      </>
    );
  }

  const team = allStaff.filter((m) => m.tenantId === sub?.tenant.id);
  const staff = team.filter((m) => m.role === "staff" && m.status === "Active");
  const assignedName = order.assignedStaffId
    ? (team.find((m) => m.id === order.assignedStaffId)?.name ?? "Unavailable")
    : undefined;

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
        <Link href="/manager/bookings" className="btn btn-secondary">
          ← Back to orders
        </Link>

        <OrderDetails
          order={order}
          assignedName={assignedName}
          actions={
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
          }
        />
      </div>
    </>
  );
}