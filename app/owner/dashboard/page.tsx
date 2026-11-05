"use client";

import { useEffect } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import SectionHeading from "../../../components/ui/SectionHeading";
import RevenueChart from "../../../components/charts/RevenueChart";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import ListingBanner from "../../../components/owner/ListingBanner";
import {
  forTenant,
  isClosed,
  money,
  restoreOrders,
  statusLabel,
  useOrders,
  vehicleName,
} from "../../../lib/orders";
import { Stars } from "../../../components/customer/StarRating";
import { publicName, ratingStats, restoreReviews, reviewsForTenant, useReviews } from "../../../lib/reviews";

export default function OwnerDashboard() {
  const sub = useOwnerSubscription();
  const orders = forTenant(useOrders(), sub?.tenant.id);
    const tenantReviews = reviewsForTenant(useReviews(), sub?.tenant.id);
  const stats = ratingStats(tenantReviews);

  useEffect(() => {
    restoreOrders();
    restoreReviews();
  }, []);

  const revenue = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.amount, 0);
  const open = orders.filter((o) => !isClosed(o.status));
  const recent = orders.slice(0, 5); // newest first

  return (
    <>
      <Topbar title="Owner Dashboard" subtitle="Business performance across your service centre" />
<ListingBanner/>
      <div className="container space-y-7">
        <div className="grid-auto">
          <KpiCard icon="rupee" label="Revenue (completed orders)" value={money(revenue)} />
          <KpiCard icon="calendar" label="Orders" value={String(orders.length)} />
          <KpiCard icon="clock" label="Open orders" value={String(open.length)} />
          <KpiCard
  icon="star"
  label="Average rating"
  value={stats.count ? `${stats.average.toFixed(1)} / 5 (${stats.count})` : "No reviews yet"}
/>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card p-6">
            <SectionHeading title="Revenue trend" description="Monthly revenue in lakhs" />
            <RevenueChart />
          </section>

          <section className="card p-6">
            <SectionHeading
              title="Recent orders"
              action={
                <Link href="/owner/allorders" className="text-xs font-bold">
                  View all →
                </Link>
              }
            />
            <div className="space-y-3">
              {recent.length === 0 && <p className="muted text-sm">No orders yet.</p>}
              {recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/owner/allorders/${o.id}`}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <div>
                    <p className="font-bold">{o.id}</p>
                    <p className="muted text-xs">
                      {vehicleName(o)} · {o.service} · {statusLabel(o.status)}
                    </p>
                  </div>
                  <b>{money(o.amount)}</b>
                </Link>
              ))}
            </div>
          </section>
        </div>
              <section className="card p-6">
          <SectionHeading title="Customer reviews" description="What customers said after their vehicle was delivered" />
          <div className="space-y-3">
            {tenantReviews.length === 0 && <p className="muted text-sm">No reviews yet.</p>}
            {tenantReviews.slice(0, 5).map((r) => (
              <Link
                key={r.id}
                href={`/owner/allorders/${r.orderId}`}
                className="block rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{publicName(r.customerName)}</b>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="mt-2 line-clamp-2 text-sm text-slate-700">{r.comment}</p>}
                <p className="muted mt-1 text-xs">Order {r.orderId}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}