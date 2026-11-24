"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import KpiCard from "../../../../components/cards/KpiCard";
import DataTable from "../../../../components/tables/DataTable";
import PlatformRevenueChart from "../../../../components/admin/PlatformRevenueChart";
import {
  formatDate,
  formatINR,
  presetRange,
  previousRange,
  ymd,
  type Preset,
} from "../../../../lib/revenue";

const PAGE_SIZE = 10;
const API = `${process.env.NEXT_PUBLIC_APP_URL}`;

const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: "This month",
  lastMonth: "Last month",
  last3Months: "Last 3 months",
  thisFY: "This financial year",
  lastFY: "Last financial year",
  custom: "Custom range",
};

type RevenueSummary = {
  total: number;
  count: number;
  average: number;
  payingTenants: number;
};

type RevenuePrevious = {
  total: number;
  count: number;
};

type RevenueMonthPoint = {
  month: string;
  total: number;
  count: number;
};

type RevenuePaymentItem = {
  id: string;
  invoiceNo: string;
  tenantId: string;
  tenant: string;
  plan: string;
  amount: number;
  payDate: string;
};

type RevenueApiResponse = {
  summary?: RevenueSummary;
  previous?: RevenuePrevious | null;
  byMonth?: RevenueMonthPoint[];
  payments?: RevenuePaymentItem[];
  page?: number;
  limit?: number;
  hasNextPage?: boolean;
  error?: string;
};

type RevenueSwrKey = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  number,
];

function formatMonthLabel(ym: string): string {
  const parts = ym.split("-");
  if (parts.length !== 2) return ym;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return ym;
  }
  return new Date(Date.UTC(year, monthIdx, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatPayDate(isoOrYmd: string): string {
  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return formatDate(isoOrYmd);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const ymdStr = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(
    ist.getUTCDate()
  ).padStart(2, "0")}`;
  return formatDate(ymdStr);
}

async function fetchRevenue([
  ,
  baseUrl,
  from,
  to,
  prevFrom,
  prevTo,
  page,
  limit,
]: RevenueSwrKey): Promise<RevenueApiResponse> {
  const params = new URLSearchParams({
    from,
    to,
    page: String(page),
    limit: String(limit),
  });

  if (prevFrom && prevTo) {
    params.set("prevFrom", prevFrom);
    params.set("prevTo", prevTo);
  }

  const res = await fetch(`${baseUrl}/api/admin/revenue?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const raw: unknown = await res.json().catch(() => null);
  const json = (raw && typeof raw === "object" ? raw : null) as RevenueApiResponse | null;

  if (!res.ok || !json) {
    throw new Error(json?.error ?? "Unable to load revenue analytics.");
  }

  return json;
}

export default function Revenue() {
  const [today, setToday] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setToday(ymd(new Date()));
  }, []);

  const changePreset = (next: Preset) => {
    if (next === "custom" && today && !customFrom && !customTo) {
      setCustomFrom(presetRange("thisMonth", today).from);
      setCustomTo(today);
    }

    setPreset(next);
    setPage(1);
  };

  const invalid =
    preset === "custom" &&
    (!customFrom || !customTo || customFrom > customTo);

  const range = useMemo(() => {
    if (!today || invalid) return null;
    return preset === "custom"
      ? { from: customFrom, to: customTo }
      : presetRange(preset, today);
  }, [today, invalid, preset, customFrom, customTo]);

  const prevRange = useMemo(() => {
    if (!range || !today) return null;
    return previousRange(range, today, preset);
  }, [range, today, preset]);

  const swrKey: RevenueSwrKey | null =
    range && !invalid
      ? ([
          "admin-revenue",
          API,
          range.from,
          range.to,
          prevRange?.from ?? "",
          prevRange?.to ?? "",
          page,
          PAGE_SIZE,
        ] as const)
      : null;

  const { data, error, isLoading } = useSWR<RevenueApiResponse, Error>(
    swrKey,
    fetchRevenue,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  const summary = data?.summary ?? null;
  const prevTotal = data?.previous?.total ?? 0;
  const gross = summary?.total ?? 0;
  const growth = prevTotal > 0 ? ((gross - prevTotal) / prevTotal) * 100 : null;
  const payments = data?.payments ?? [];

  const chartData = useMemo(
    () =>
      (data?.byMonth ?? []).map((m) => ({
        label: formatMonthLabel(m.month),
        amount: Number(m.total) || 0,
      })),
    [data?.byMonth]
  );

  const hasMonthRevenue = chartData.some((m) => m.amount > 0);
  const hasNextPage = Boolean(data?.hasNextPage);

  return (
    <>
      <Topbar
        title="Revenue Analytics"
        subtitle="Subscription payments received from service centres"
      />

      <div className="container space-y-6">
        {/* Time Period */}
        <div className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                Time Period:
              </span>
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
            <p className="mt-3 text-sm font-medium text-rose-500">
              Invalid date range. Start date cannot be after the end date.
            </p>
          )}

          {error && !summary && (
            <p className="mt-3 text-sm font-medium text-rose-600">
              {error.message}
            </p>
          )}

          {range && !invalid && (
            <p className="mt-3 text-sm text-slate-500">
              Showing {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Gross revenue"
            value={isLoading && !summary ? "–" : summary ? formatINR(gross) : "–"}
            change={
              summary
                ? growth === null
                  ? "No earlier data to compare"
                  : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs previous period`
                : undefined
            }
          />

          <KpiCard
            icon="receipt"
            label="Invoices"
            value={isLoading && !summary ? "–" : summary ? summary.count : "–"}
          />

          <KpiCard
            icon="activity"
            label="Average payment"
            value={isLoading && !summary ? "–" : summary ? formatINR(summary.average) : "–"}
          />

          <KpiCard
            icon="building"
            label="Paying tenants"
            value={isLoading && !summary ? "–" : summary ? summary.payingTenants : "–"}
          />
        </div>

        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="text-xl font-black">Revenue by month</h2>
          <p className="muted mt-1 text-sm">
            Subscription revenue in the selected period
          </p>

          {summary && hasMonthRevenue ? (
            <PlatformRevenueChart data={chartData} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">
              {invalid
                ? "Choose a valid date range."
                : isLoading
                  ? "Loading monthly revenue…"
                  : "No payments in this period."}
            </p>
          )}
        </div>

        {/* Payments */}
        <div>
          <h2 className="mb-3 text-lg font-black">Payments</h2>

          <DataTable
            pageSize={PAGE_SIZE}
            headers={["Invoice", "Date", "Tenant", "Plan", "Amount"]}
            rows={payments.map((p) => [
              <span key="i" className="font-mono text-xs">
                {p.invoiceNo || p.id}
              </span>,
              formatPayDate(p.payDate),
              <b key="t">{p.tenant}</b>,
              p.plan,
              <b key="a">{formatINR(p.amount)}</b>,
            ])}
          />

          {summary && payments.length === 0 && !isLoading && (
            <p className="py-8 text-center text-sm text-slate-500">
              No payments in this period.
            </p>
          )}

          {/* Pagination */}
          {(page > 1 || hasNextPage) && (
            <nav
              className="mt-4 flex flex-wrap items-center justify-between gap-3"
              aria-label="Payment pagination"
            >
              <p className="text-sm text-slate-500">
                Page {page}
                {summary ? ` · ${summary.count} total in range` : ""}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  aria-label="Previous page"
                  className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                <span
                  className="min-w-20 text-center text-sm font-semibold text-slate-700"
                  aria-live="polite"
                >
                  Page {page}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage || isLoading}
                  aria-label="Next page"
                  className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
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