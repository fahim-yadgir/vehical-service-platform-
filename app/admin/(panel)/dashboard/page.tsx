"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import KpiCard from "../../../../components/cards/KpiCard";
import Badge from "../../../../components/ui/Badge";
import { revenueMonths, store, useAppSelector, type Tenant } from "../../../../lib/redux-store";
import { revenue } from "../../../../lib/mock-data";

const DAY = 24 * 60 * 60 * 1000;
const toTime = (date: string) => new Date(`${date}T00:00:00`).getTime();
const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Whole days from today until the subscription ends (negative = already expired). */
const daysLeft = (tenant: Tenant, today: number) => Math.ceil((toTime(tenant.subscriptionExpiresAt) - today) / DAY);

export default function Dashboard() {
  const tenants = useAppSelector((state) => state.tenants);
  const selectedMonth = useAppSelector((state) => state.selectedRevenueMonth);

  // "Today" is read after mount so the server-rendered page and the browser never disagree.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime());
  }, []);

  const active = tenants.filter((t) => t.status === "Active").length;
  const suspended = tenants.filter((t) => t.status === "Suspended").length;
  const totalUsers = tenants.reduce((sum, t) => sum + t.users, 0);

  // Subscriptions that already ended or end within 30 days, most urgent first.
  const attention =
    today === null
      ? []
      : tenants
          .map((t) => ({ tenant: t, left: daysLeft(t, today) }))
          .filter(({ left }) => left <= 30)
          .sort((a, b) => a.left - b.left);
  const expiringSoon = attention.filter(({ left }) => left >= 0).length;

  const recent = [...tenants].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt)).slice(0, 5);

  const selectedRevenue = revenue.find(({ month }) => month === selectedMonth);
  const totalRevenue = selectedRevenue
    ? `₹${selectedRevenue.value.toFixed(1)}L`
    : `₹${revenue.reduce((total, item) => total + item.value, 0).toFixed(1)}L`;

  return (
    <>
      <Topbar title="Platform Admin" subtitle="Service centres, subscriptions and revenue at a glance" />

      <div className="container space-y-7">
        <div className="flex items-center justify-end gap-3">
          <label htmlFor="revenue-month" className="text-sm font-semibold text-slate-600">
            Revenue month
          </label>
          <select
            id="revenue-month"
            value={selectedMonth}
            onChange={(event) => store.dispatch({ type: "revenue/monthSelected", payload: event.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          >
            {revenueMonths.map((month) => (
              <option key={month} value={month}>
                {month === "all" ? "All months" : month}
              </option>
            ))}
          </select>
        </div>

        <div className="grid-auto">
          <KpiCard icon="building" label="Total tenants" value={tenants.length} />
          <KpiCard icon="check" label="Active tenants" value={active} />
          <KpiCard icon="activity" label="Suspended" value={suspended} />
          <KpiCard icon="clock" label="Expiring in 30 days" value={today === null ? "–" : expiringSoon} />
          <KpiCard icon="users" label="Platform users" value={totalUsers.toLocaleString()} />
          <KpiCard icon="rupee" label="Total revenue" value={totalRevenue} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Subscriptions needing attention</h2>
                <p className="muted mt-1 text-sm">Expired or ending within 30 days</p>
              </div>
              <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700">
                Manage <ArrowRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {today !== null && attention.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">All subscriptions are healthy.</p>}
              {attention.map(({ tenant, left }) => (
                <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-40">
                    <p className="font-bold text-slate-900">{tenant.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {tenant.plan} · ends {formatDate(tenant.subscriptionExpiresAt)}
                    </p>
                  </div>
                  <Badge tone={left < 0 ? "red" : "yellow"}>
                    {left < 0 ? `Expired ${-left} day${left === -1 ? "" : "s"} ago` : left === 0 ? "Ends today" : `${left} day${left === 1 ? "" : "s"} left`}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Recently added tenants</h2>
                <p className="muted mt-1 text-sm">Latest service centres on the platform</p>
              </div>
              <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700">
                All tenants <ArrowRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recent.map((tenant) => (
                <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-40">
                    <p className="font-bold text-slate-900">{tenant.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {tenant.owner} · joined {formatDate(tenant.createdAt)}
                    </p>
                  </div>
                  <Badge tone={tenant.status === "Active" ? "green" : "gray"}>{tenant.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}