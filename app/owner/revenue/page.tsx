"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Topbar from "../../../components/navbar/Topbar";
import KpiCard from "../../../components/cards/KpiCard";
import SectionHeading from "../../../components/ui/SectionHeading";
import PlatformRevenueChart from "../../../components/admin/PlatformRevenueChart";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { forTenant, restoreOrders, useOrders } from "../../../lib/orders";
import {
  formatDate,
  formatINR,
  formatINRShort,
  monthlyTotals,
  presetRange,
  previousRange,
  total,
  ymd,
  type Payment,
  type Preset,
  type Range as DateRange,
} from "../../../lib/revenue";

const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: "This month",
  lastMonth: "Last month",
  last3Months: "Last 3 months",
  thisFY: "This financial year",
  lastFY: "Last financial year",
  custom: "Custom range",
};

type Kind = "Car" | "Bike";
type Source = "customer" | "centre";
/** One completed order as a revenue entry. `plan` of Payment holds the service name. */
type Sale = Payment & { kind: Kind; source: Source };

const COLORS = ["#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e", "#eab308"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_DAILY_POINTS = 62;
const TICK = { fontSize: 12, fill: "#64748b" };

const kindOf = (vehicleType: string): Kind => (/bike|scooter|motorcycle/i.test(vehicleType) ? "Bike" : "Car");
const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Revenue of every day in the range (up to today). */
function dailyTotals(sales: Sale[], r: DateRange, today: string) {
  const end = r.to < today ? r.to : today;
  const byDay = new Map<string, number>();
  sales.forEach((s) => byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.amount));
  const rows: { label: string; amount: number }[] = [];
  const cursor = parseDay(r.from);
  const last = parseDay(end);
  while (cursor <= last && rows.length < 400) {
    rows.push({
      label: cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      amount: byDay.get(ymd(cursor)) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

function sumBy(sales: Sale[], key: (s: Sale) => string) {
  const map = new Map<string, number>();
  sales.forEach((s) => map.set(key(s), (map.get(key(s)) ?? 0) + s.amount));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <p className="muted text-xs">{label}</p>
      <p className="mt-2 truncate text-2xl font-black text-slate-900">{value}</p>
      {note && <p className="muted mt-1 text-xs">{note}</p>}
    </div>
  );
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatINR(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

export default function OwnerRevenue() {
  const sub = useOwnerSubscription();
  const tenantId = sub?.tenant.id;
  const allOrders = useOrders();
  const today = ymd(new Date());

  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [custom, setCustom] = useState({ from: today, to: today });
  const [service, setService] = useState("all");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [source, setSource] = useState<"all" | Source>("all");
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");

  useEffect(() => {
    restoreOrders();
  }, []);

  // Revenue = completed orders, dated on the day they were completed.
  const sales: Sale[] = useMemo(
    () =>
      forTenant(allOrders, tenantId)
        .filter((o) => o.status === "completed")
        .map((o) => ({
          id: o.id,
          tenantId: o.tenantId ?? "",
          tenant: o.customer.name,
          plan: o.service,
          amount: o.amount,
          date: ymd(new Date(o.completedBy?.at ?? o.createdBy.at)),
          kind: kindOf(o.vehicle.type),
          source: o.source ?? "customer",
        })),
    [allOrders, tenantId],
  );

  const serviceOptions = useMemo(() => [...new Set(sales.map((s) => s.plan))].sort(), [sales]);

  const range = preset === "custom" ? custom : presetRange(preset, today);
  const valid = range.from <= range.to;
  const passes = (s: Sale) =>
    (service === "all" || s.plan === service) && (kind === "all" || s.kind === kind) && (source === "all" || s.source === source);
  const inRangeOf = (r: DateRange) => sales.filter((s) => s.date >= r.from && s.date <= r.to && passes(s));

  const current = valid ? inRangeOf(range) : [];
  const revenue = total(current);
  const previous = valid ? total(inRangeOf(previousRange(range, today, preset))) : 0;
  const change = previous > 0 ? ((revenue - previous) / previous) * 100 : null;
  const average = current.length ? Math.round(revenue / current.length) : 0;

  const byService = sumBy(current, (s) => s.plan);
  const topService = byService[0];
  const byKind = sumBy(current, (s) => s.kind);
  const bySource = sumBy(current, (s) => (s.source === "customer" ? "Customer bookings" : "Walk-in / phone"));
  const walkIn = current.filter((s) => s.source === "centre").length;
  const walkInShare = current.length ? Math.round((walkIn / current.length) * 100) : 0;

  const weekday = WEEKDAYS.map((name) => ({ name, value: 0 }));
  current.forEach((s) => {
    weekday[(parseDay(s.date).getDay() + 6) % 7].value += s.amount;
  });

  const daily = valid ? dailyTotals(current, range, today) : [];
  const canDay = daily.length > 0 && daily.length <= MAX_DAILY_POINTS;
  const view = canDay ? groupBy : "month";
  const monthly = valid ? monthlyTotals(current, range, today) : [];

  const filtersOn = service !== "all" || kind !== "all" || source !== "all";
  const reset = () => {
    setService("all");
    setKind("all");
    setSource("all");
  };

  return (
    <>
      <Topbar title="Revenue" subtitle="Earnings from completed orders at your service centre" />
      <div className="container space-y-7">
        {/* Filters */}
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Period">
            {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
              <Chip key={p} active={preset === p} onClick={() => setPreset(p)}>
                {PRESET_LABELS[p]}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {preset === "custom" && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">From</span>
                  <input type="date" className="input" value={custom.from} max={today} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">To</span>
                  <input type="date" className="input" value={custom.to} max={today} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
                </label>
              </>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Service</span>
              <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
                <option value="all">All services</option>
                {serviceOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Vehicle</span>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "all" | Kind)}>
                <option value="all">Cars and bikes</option>
                <option value="Car">Cars</option>
                <option value="Bike">Bikes</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Source</span>
              <select className="input" value={source} onChange={(e) => setSource(e.target.value as "all" | Source)}>
                <option value="all">All orders</option>
                <option value="customer">Customer bookings</option>
                <option value="centre">Walk-in / phone</option>
              </select>
            </label>
            {filtersOn && (
              <button type="button" onClick={reset} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Reset filters
              </button>
            )}
          </div>

          <p className="muted text-sm">
            {valid ? `${formatDate(range.from)} to ${formatDate(range.to)}` : "Choose a valid date range."}
          </p>
        </section>

        {/* KPIs */}
        <div className="grid-auto">
          <KpiCard
            icon="rupee"
            label="Revenue"
            value={formatINR(revenue)}
            change={change === null ? undefined : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
          />
          <KpiCard icon="check" label="Completed orders" value={String(current.length)} />
          <KpiCard icon="calendar" label="Average order" value={formatINR(average)} />
          <Stat label="Top service" value={topService ? topService.name : "–"} note={topService ? `${formatINR(topService.value)} earned` : "No orders yet"} />
          <Stat label="Walk-in share" value={`${walkInShare}%`} note={`${walkIn} of ${current.length} orders`} />
        </div>

        {current.length === 0 ? (
          <section className="card p-10 text-center">
            <p className="font-bold text-slate-900">No completed orders match these filters</p>
            <p className="muted mt-1 text-sm">Try another period or reset the filters.</p>
          </section>
        ) : (
          <>
            {/* Trend */}
            <section className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  title={view === "day" ? "Revenue by day" : "Revenue by month"}
                  description="Completed orders in the selected period"
                />
                <div className="flex items-center gap-1.5" aria-label="Group by">
                  <Chip active={view === "day"} onClick={() => canDay && setGroupBy("day")}>Day</Chip>
                  <Chip active={view === "month"} onClick={() => setGroupBy("month")}>Month</Chip>
                </div>
              </div>
              {view === "month" ? (
                monthly.length > 0 ? <PlatformRevenueChart data={monthly} /> : <p className="muted py-8 text-center text-sm">No data for this period.</p>
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ownerRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={TICK} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis tick={TICK} tickFormatter={(v) => formatINRShort(Number(v))} width={56} />
                      <Tooltip formatter={(v) => formatINR(Number(v))} />
                      <Area type="monotone" dataKey="amount" name="Revenue" stroke="#f97316" strokeWidth={2} fill="url(#ownerRevenueFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="card p-6">
                <SectionHeading title="Top services" description="Revenue by service" />
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byService.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={TICK} tickFormatter={(v) => formatINRShort(Number(v))} />
                      <YAxis type="category" dataKey="name" tick={TICK} width={110} />
                      <Tooltip formatter={(v) => formatINR(Number(v))} />
                      <Bar dataKey="value" name="Revenue" fill="#f97316" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="card p-6">
                <SectionHeading title="Revenue by weekday" description="Which days earn the most" />
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={TICK} />
                      <YAxis tick={TICK} tickFormatter={(v) => formatINRShort(Number(v))} width={56} />
                      <Tooltip formatter={(v) => formatINR(Number(v))} />
                      <Bar dataKey="value" name="Revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="card p-6">
                <SectionHeading title="Vehicle type" description="Cars and bikes" />
                <Donut data={byKind} />
              </section>

              <section className="card p-6">
                <SectionHeading title="Booking source" description="Customer bookings and walk-ins" />
                <Donut data={bySource} />
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}