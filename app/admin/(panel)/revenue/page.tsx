"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import KpiCard from "../../../../components/cards/KpiCard";
import DataTable from "../../../../components/tables/DataTable";
import PlatformRevenueChart from "../../../../components/admin/PlatformRevenueChart";
import { restoreTenants, useAppSelector } from "../../../../lib/redux-store";
import {
  buildPayments, formatDate, formatINR, inRange, monthlyTotals, presetRange, previousRange, total, ymd,
  type Preset,
} from "../../../../lib/revenue";

const PAGE_SIZE = 10;

const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: "This month",
  lastMonth: "Last month",
  last3Months: "Last 3 months",
  thisYear: "This year",
  custom: "Custom range",
};

export default function Revenue() {
  const tenants = useAppSelector((state) => state.tenants);
  // "Today" is read after mount so the server page and the browser never disagree.
  const [today, setToday] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    restoreTenants();
    setToday(ymd(new Date()));
  }, []);

  const payments = useMemo(() => (today ? buildPayments(tenants, today) : []), [tenants, today]);

  const changePreset = (next: Preset) => {
    if (next === "custom" && today && !customFrom && !customTo) {
      setCustomFrom(presetRange("thisMonth", today).from);
      setCustomTo(today);
    }
    setPreset(next);
    setPage(1);
  };

  const invalid = preset === "custom" && (!customFrom || !customTo || customFrom > customTo);
  const range = !today || invalid ? null : preset === "custom" ? { from: customFrom, to: customTo } : presetRange(preset, today);

  const view = useMemo(() => {
    if (!range || !today) return null;
    const rows = inRange(payments, range);
    const gross = total(rows);
    const prev = total(inRange(payments, previousRange(range, today, preset)));
    const growth = prev > 0 ? ((gross - prev) / prev) * 100 : null;
    return {
      rows,
      gross,
      growth,
      avg: rows.length ? gross / rows.length : 0,
      payingTenants: new Set(rows.map((p) => p.tenantId)).size,
      months: monthlyTotals(payments, range, today),
    };
  }, [payments, range, today, preset]);

  const pageCount = Math.max(1, Math.ceil((view?.rows.length ?? 0) / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = view?.rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE) ?? [];

  return (
    <>
      <Topbar title="Revenue Analytics" subtitle="Subscription payments received from service centres" />

      <div className="container space-y-6">
        <div className="card p-5">
          {/* Dropdown for Period Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Time Period:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={preset}
                onChange={(e) => changePreset(e.target.value as Preset)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {(Object.keys(PRESET_LABELS) as Preset[]).map((key) => (
                  <option key={key} value={key}>
                    {PRESET_LABELS[key]}
                  </option>
                ))}
              </select>

              {/* Custom Range Date Pickers (Visible only when "custom" is selected) */}
              {preset === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-500">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          {invalid && (
            <p className="mt-3 text-sm text-rose-500 font-medium">
              Invalid date range. Start date cannot be after the end date.
            </p>
          )}

          {range && !invalid && (
            <p className="mt-3 text-sm text-slate-500">
              Showing {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          )}
        </div>

        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Gross revenue"
            value={view ? formatINR(view.gross) : "–"}
            change={view ? (view.growth === null ? "No earlier data to compare" : `${view.growth >= 0 ? "+" : ""}${view.growth.toFixed(1)}% vs previous period`) : undefined}
          />
          <KpiCard icon="receipt" label="Invoices" value={view ? view.rows.length : "–"} />
          <KpiCard icon="activity" label="Average payment" value={view ? formatINR(view.avg) : "–"} />
          <KpiCard icon="building" label="Paying tenants" value={view ? view.payingTenants : "–"} />
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-black">Revenue by month</h2>
          <p className="muted mt-1 text-sm">Subscription revenue in the selected period</p>
          {view && view.rows.length > 0 ? (
            <PlatformRevenueChart data={view.months} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">{invalid ? "Choose a valid date range." : "No payments in this period."}</p>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-black">Payments</h2>
          <DataTable
            headers={["Invoice", "Date", "Tenant", "Plan", "Amount"]}
            rows={pageRows.map((p) => [
              <span key="i" className="font-mono text-xs">{p.id}</span>,
              formatDate(p.date),
              <b key="t">{p.tenant}</b>,
              p.plan,
              <b key="a">{formatINR(p.amount)}</b>,
            ])}
          />
          {view && view.rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No payments in this period.</p>}

          {pageCount > 1 && (
            <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Payment pagination">
              <p className="text-sm text-slate-500">
                Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, view?.rows.length ?? 0)} of {view?.rows.length} payments
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} aria-label="Previous page" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-20 text-center text-sm font-semibold text-slate-700" aria-live="polite">Page {current} of {pageCount}</span>
                <button type="button" onClick={() => setPage(Math.min(pageCount, current + 1))} disabled={current === pageCount} aria-label="Next page" className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight size={18} />
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}