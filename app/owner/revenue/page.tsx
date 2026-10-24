"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import DataTable from "../../../components/tables/DataTable";
import PlatformRevenueChart from "../../../components/admin/PlatformRevenueChart";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { itemsSummary, orderTotal, useTenantOrders, type Order } from "../../../lib/orders";
import { formatDate, formatINR, inRange, monthlyTotals, presetRange, previousRange, total, ymd, type Payment, type Preset } from "../../../lib/revenue";

const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: "This month",
  lastMonth: "Last month",
  last3Months: "Last 3 months",
  thisFY: "This financial year",
  lastFY: "Last financial year",
  custom: "Custom range",
};

const OPEN_STATUSES: Order["status"][] = ["New", "Assigned", "In Progress"];

export default function OwnerRevenue() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const { orders, loaded } = useTenantOrders(tenant?.id);

  // "Today" is read after mount so the server page and the browser never disagree.
  const [today, setToday] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    setToday(ymd(new Date()));
  }, []);

  // Revenue = completed orders. They are shaped like payments so the admin's date-range helpers can be reused.
  const byId = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const payments: Payment[] = useMemo(
    () => orders.filter((o) => o.status === "Completed").map((o) => ({ id: o.id, tenantId: o.tenantId, tenant: o.customer, plan: itemsSummary(o), amount: orderTotal(o), date: o.date })),
    [orders],
  );

  const changePreset = (next: Preset) => {
    if (next === "custom" && today && !customFrom && !customTo) {
      setCustomFrom(presetRange("thisMonth", today).from);
      setCustomTo(today);
    }
    setPreset(next);
  };

  const invalid = preset === "custom" && (!customFrom || !customTo || customFrom > customTo);
  const range = !today || invalid ? null : preset === "custom" ? { from: customFrom, to: customTo } : presetRange(preset, today);

  const view = useMemo(() => {
    if (!range || !today) return null;
    const rows = inRange(payments, range);
    const done = rows.map((p) => byId.get(p.id)).filter((o): o is Order => !!o);
    const gross = total(rows);
    const prev = total(inRange(payments, previousRange(range, today, preset)));

    // Which work earned the most in this period.
    const byService = new Map<string, { times: number; revenue: number }>();
    done.forEach((o) => o.items.forEach((i) => {
      const cur = byService.get(i.name) ?? { times: 0, revenue: 0 };
      byService.set(i.name, { times: cur.times + 1, revenue: cur.revenue + i.price });
    }));

    // Money still to come from orders that are not finished yet.
    const open = orders.filter((o) => OPEN_STATUSES.includes(o.status) && o.date >= range.from && o.date <= range.to);

    return {
      rows,
      done,
      gross,
      growth: prev > 0 ? ((gross - prev) / prev) * 100 : null,
      avg: rows.length ? gross / rows.length : 0,
      customers: new Set(done.map((o) => o.mobile)).size,
      months: monthlyTotals(payments, range, today),
      services: [...byService.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
      pendingAmount: open.reduce((sum, o) => sum + orderTotal(o), 0),
      pendingCount: open.length,
    };
  }, [payments, byId, orders, range, today, preset]);

  const ready = loaded && view;

  return (
    <>
      <Topbar title="Revenue" subtitle={tenant ? `Earnings of ${tenant.name} from completed orders` : "Earnings from completed orders"} />

      <div className="container space-y-6">
        {/* Time Period */}
        <div className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <label htmlFor="revenue-period" className="text-sm font-semibold text-slate-700">Time Period:</label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                id="revenue-period"
                value={preset}
                onChange={(e) => changePreset(e.target.value as Preset)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {(Object.keys(PRESET_LABELS) as Preset[]).map((key) => (
                  <option key={key} value={key}>{PRESET_LABELS[key]}</option>
                ))}
              </select>

              {preset === "custom" && (
                <div className="flex items-center gap-2">
                  <input type="date" aria-label="From date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-500">to</span>
                  <input type="date" aria-label="To date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              )}
            </div>
          </div>

          {invalid && <p role="alert" className="mt-3 text-sm font-medium text-rose-500">Invalid date range. Start date cannot be after the end date.</p>}
          {range && !invalid && <p className="mt-3 text-sm text-slate-500">Showing {formatDate(range.from)} – {formatDate(range.to)}</p>}
        </div>

        {/* KPI Cards */}
        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Revenue"
            value={ready ? formatINR(view.gross) : "–"}
            change={ready ? (view.growth === null ? "No earlier data to compare" : `${view.growth >= 0 ? "+" : ""}${view.growth.toFixed(1)}% vs previous period`) : undefined}
          />
          <KpiCard icon="check" label="Completed orders" value={ready ? view.done.length : "–"} />
          <KpiCard icon="activity" label="Average order" value={ready ? formatINR(view.avg) : "–"} />
          <KpiCard icon="users" label="Customers" value={ready ? view.customers : "–"} change={ready && view.customers > 0 ? "paid in this period" : undefined} />
        </div>

        {ready && view.pendingCount > 0 && (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-800">
            {formatINR(view.pendingAmount)} more to come from {view.pendingCount} open order{view.pendingCount === 1 ? "" : "s"} in this period. It counts as revenue once they are completed.
          </p>
        )}

        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="text-xl font-black">Revenue by month</h2>
          <p className="muted mt-1 text-sm">Completed orders in the selected period</p>
          {ready && view.done.length > 0 ? (
            <PlatformRevenueChart data={view.months} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">{invalid ? "Choose a valid date range." : loaded ? "No completed orders in this period." : "Loading…"}</p>
          )}
        </div>

        {/* By service */}
        {ready && view.services.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-black">Revenue by service</h2>
            <DataTable
              headers={["Service", "Times done", "Revenue", "Share"]}
              rows={view.services.map((s) => [
                <b key="n">{s.name}</b>,
                s.times,
                <b key="r">{formatINR(s.revenue)}</b>,
                `${view.gross ? Math.round((s.revenue / view.gross) * 100) : 0}%`,
              ])}
            />
          </div>
        )}
      </div>
    </>
  );
}