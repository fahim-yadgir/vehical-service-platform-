"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import DataTable from "../../../components/tables/DataTable";
import SectionHeading from "../../../components/ui/SectionHeading";
import PlatformRevenueChart from "../../../components/admin/PlatformRevenueChart";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { forTenant, restoreOrders, useOrders } from "../../../lib/orders";
import {
  formatDate,
  formatINR,
  inRange,
  monthlyTotals,
  presetRange,
  previousRange,
  total,
  ymd,
  type Payment,
  type Preset,
} from "../../../lib/revenue";

const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: "This month",
  lastMonth: "Last month",
  last3Months: "Last 3 months",
  thisFY: "This financial year",
  lastFY: "Last financial year",
  custom: "Custom range",
};

export default function OwnerRevenue() {
  const sub = useOwnerSubscription();
  const orders = forTenant(useOrders(), sub?.tenant.id);
  const today = ymd(new Date());

  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [custom, setCustom] = useState({ from: today, to: today });

  useEffect(() => {
    restoreOrders();
  }, []);

  // Revenue = completed orders, dated on the day they were completed.
  const payments: Payment[] = orders
    .filter((o) => o.status === "completed")
    .map((o) => ({
      id: o.id,
      tenantId: o.tenantId ?? "",
      tenant: o.customer.name,
      plan: o.service,
      amount: o.amount,
      date: ymd(new Date(o.completedBy?.at ?? o.createdBy.at)),
    }));

  const range = preset === "custom" ? custom : presetRange(preset, today);
  const valid = range.from <= range.to;
  const inPeriod = valid ? inRange(payments, range) : [];
  const revenue = total(inPeriod);
  const previous = valid ? total(inRange(payments, previousRange(range, today, preset))) : 0;
  const change = previous > 0 ? ((revenue - previous) / previous) * 100 : null;
  const average = inPeriod.length ? Math.round(revenue / inPeriod.length) : 0;
  const chart = valid ? monthlyTotals(payments, range, today) : [];
  const rows = [...inPeriod].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Topbar title="Revenue" subtitle="Earnings from completed orders at your service centre" />
      <div className="container space-y-7">
        <section className="card flex flex-wrap items-end gap-4 p-5">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Period</span>
            <select
              className="input"
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
            >
              {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
                <option key={p} value={p}>
                  {PRESET_LABELS[p]}
                </option>
              ))}
            </select>
          </label>

          {preset === "custom" && (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">From</span>
                <input
                  type="date"
                  className="input"
                  value={custom.from}
                  max={today}
                  onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">To</span>
                <input
                  type="date"
                  className="input"
                  value={custom.to}
                  max={today}
                  onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                />
              </label>
            </>
          )}

          <p className="muted text-sm">
            {valid ? `${formatDate(range.from)} to ${formatDate(range.to)}` : "Choose a valid date range."}
          </p>
        </section>

        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Revenue"
            value={formatINR(revenue)}
            change={change === null ? undefined : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
          />
          <KpiCard icon="check" label="Completed orders" value={String(inPeriod.length)} />
          <KpiCard icon="calendar" label="Average order" value={formatINR(average)} />
        </div>

        <section className="card p-6">
          <SectionHeading title="Revenue by month" description="Completed orders in the selected period" />
          {chart.length > 0 ? (
            <PlatformRevenueChart data={chart} />
          ) : (
            <p className="muted py-8 text-center text-sm">No data for this period.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900">Completed orders</h2>
          <DataTable
            headers={["Order", "Completed on", "Customer", "Service", "Amount"]}
            rows={rows.map((p) => [
              <Link key="id" href={`/owner/allorders/${p.id}`} className="font-bold hover:underline">
                {p.id}
              </Link>,
              formatDate(p.date),
              p.tenant,
              p.plan,
              formatINR(p.amount),
            ])}
          />
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">No completed orders in this period.</p>
          )}
        </section>
      </div>
    </>
  );
}