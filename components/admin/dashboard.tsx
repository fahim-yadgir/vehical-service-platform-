"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AppShell from "../layout/AppShell";
import Topbar from "../navbar/Topbar";
import KpiCard from "../cards/KpiCard";
import Badge from "../ui/Badge";
import { recentMembers, revenueMonths, store, useAppSelector } from "../../lib/redux-store";
import { revenue } from "../../lib/mock-data";

export default function Dashboard() {
  const tenants = useAppSelector((state) => state.tenants);
  const selectedMonth = useAppSelector((state) => state.selectedRevenueMonth);
  const selectedRevenue = revenue.find(({ month }) => month === selectedMonth);
  const activeServices = tenants.filter((tenant) => tenant.status === "Active").length;
  const totalMembers = tenants.reduce((count, tenant) => count + tenant.users, 0);
  const activeMembers = tenants.reduce(
    (count, tenant) => count + (tenant.status === "Active" ? tenant.users : 0),
    0,
  );
  const inactiveMembers = tenants.reduce(
    (count, tenant) => count + (tenant.status !== "Active" ? tenant.users : 0),
    0,
  );
  const totalRevenue = selectedRevenue
    ? `₹${selectedRevenue.value.toFixed(1)}L`
    : `₹${revenue.reduce((total, item) => total + item.value, 0).toFixed(1)}L`;

  return (
    <AppShell role="admin">
      <Topbar
        title="Platform Admin"
        subtitle="Global tenant, revenue and system health monitoring"
      />

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
          <KpiCard
            icon="users"
            label="Total members"
            value={totalMembers.toLocaleString()}
          />

          <KpiCard
            icon="users"
            label="Active members"
            value={activeMembers.toLocaleString()}
          />

          <KpiCard
            icon="building"
            label="Active services"
            value={activeServices.toLocaleString()}
          />

          <KpiCard
            icon="activity"
            label="Inactive members"
            value={inactiveMembers.toLocaleString()}
          />

          <KpiCard
            icon="rupee"
            label="Total revenue"
            value={totalRevenue}
          />
        </div>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Recently added members</h2>
              <p className="muted mt-1 text-sm">Latest platform member activity</p>
            </div>
            <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700">
              All members <ArrowRight size={16} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-48">
                  <p className="font-bold text-slate-900">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{member.tenant}</p>
                </div>
                <p className="text-sm text-slate-500">Joined {member.joined}</p>
                <Badge tone={member.status === "Active" ? "green" : "gray"}>{member.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}