"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import OrderDetails from "../../../../components/orders/OrderDetails";
import { useOwnerSubscription } from "../../../../lib/ownerTenant";
import { restoreStaff, useAppSelector } from "../../../../lib/redux-store";
import { forTenant, restoreOrders, useOrders, vehicleName } from "../../../../lib/orders";

export default function OwnerOrderDetails() {
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
          <Link href="/owner/allorders" className="btn btn-secondary">
            Back to orders
          </Link>
        </div>
      </>
    );
  }

  const assignedName = order.assignedStaffId
    ? (allStaff.find((m) => m.tenantId === sub?.tenant.id && m.id === order.assignedStaffId)?.name ?? "Unavailable")
    : undefined;

  return (
    <>
      <Topbar title={`Order ${order.id}`} subtitle={`${vehicleName(order)} · ${order.service}`} />
      <div className="container space-y-5">
        <Link href="/owner/allorders" className="btn btn-secondary">
          ← Back to orders
        </Link>
        <OrderDetails order={order} assignedName={assignedName} />
      </div>
    </>
  );
}