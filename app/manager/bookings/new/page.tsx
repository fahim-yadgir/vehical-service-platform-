"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Topbar from "../../../../components/navbar/Topbar";
import OrderForm, { type OrderFormData } from "../../../../components/manager/OrderForm";
import { useOwnerSubscription } from "../../../../lib/ownerTenant";
import { useOwnerRates } from "../../../../lib/ownerRates";
import { restoreStaff, useAppSelector } from "../../../../lib/redux-store";
import { createOrder, restoreOrders, useOrders } from "../../../../lib/orders";
import { orderLimitBlock } from "../../../../lib/orderLimit";

export default function NewOrderPage() {
  const router = useRouter();
  const sub = useOwnerSubscription();
  const tenantId = sub?.tenant.id;
  const { rates } = useOwnerRates(tenantId);
  const allStaff = useAppSelector((s) => s.staff);
  const orders = useOrders();

  useEffect(() => {
    restoreStaff();
    restoreOrders(); // must run before creating, so saved orders aren't overwritten
  }, []);

  const staff = allStaff.filter(
    (m) => m.tenantId === tenantId && m.role === "staff" && m.status === "Active",
  );

  // set when this month's orders of the plan are used up (cancelled orders are not counted)
  const limitMessage = tenantId ? orderLimitBlock(tenantId, orders, "centre") : null;

  const submit = (d: OrderFormData) => {
    if (!tenantId || limitMessage) return;
    const member = staff.find((m) => m.id === d.assignedStaffId);
    const id = createOrder({
      tenantId,
      customer: d.customer,
      vehicle: d.vehicle,
      service: d.service,
      date: d.date,
      amount: d.amount,
      notes: d.notes,
      assignedStaff: member ? { id: member.id, name: member.name } : undefined,
    });
    router.push(`/manager/bookings/${id}`);
  };

  return (
    <>
      <Topbar title="Add order" subtitle="Create a walk-in or phone order for your service centre" />
      <div className="container max-w-3xl space-y-5">
        <Link href="/manager/bookings" className="text-sm font-semibold underline">
          ← Back to orders
        </Link>
        {limitMessage && (
          <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {limitMessage} Please ask the owner to upgrade the plan.
          </p>
        )}
        <OrderForm services={rates?.services ?? []} staff={staff} onSubmit={submit} />
      </div>
    </>
  );
}