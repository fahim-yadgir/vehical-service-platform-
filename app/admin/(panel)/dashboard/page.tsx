"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
} from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Badge from "../../../../components/ui/Badge";
import { formatINR } from "../../../../lib/revenue";

const DAY_MS = 24 * 60 * 60 * 1000;
const API = `${process.env.NEXT_PUBLIC_APP_URL}`;

type DashboardKpis = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  expiringSoon: number;
  platformUsers: number;
  revenueThisMonth: number;
};

type AttentionTenant = {
  id: string;
  name: string;
  plan: string;
  status: "Active" | "Suspended";
  subscriptionExpiresAt: string;
};

type RecentTenant = {
  id: string;
  name: string;
  owner: string;
  status: "Active" | "Suspended";
  createdAt: string;
};

type DashboardApiResponse = {
  kpis?: DashboardKpis;
  attention?: AttentionTenant[];
  recent?: RecentTenant[];
  error?: string;
};

type KpiCardConfig = {
  key: string;
  label: string;
  value: string | number;
  accentHex: string;
  iconWrapClass: string;
  barClass: string;
  icon: "building" | "check" | "activity" | "clock" | "users" | "rupee";
};

function parseDateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00`
    : trimmed;
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatDate(value: string | null | undefined): string {
  const ms = parseDateMs(value);
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntilExpiry(expiresAt: string, nowMs: number): number | null {
  const expMs = parseDateMs(expiresAt);
  if (expMs === null) return null;
  return Math.ceil((expMs - nowMs) / DAY_MS);
}

function renderKpiIcon(icon: KpiCardConfig["icon"]) {
  switch (icon) {
    case "building":
      return <Building2 size={20} aria-hidden />;
    case "check":
      return <CheckCircle2 size={20} aria-hidden />;
    case "activity":
      return <Activity size={20} aria-hidden />;
    case "clock":
      return <Clock size={20} aria-hidden />;
    case "users":
      return <Users size={20} aria-hidden />;
    case "rupee":
      return <IndianRupee size={20} aria-hidden />;
  }
}

async function fetchDashboard([, baseUrl]: readonly [string, string]): Promise<DashboardApiResponse> {
  const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
    method: "GET",
    cache: "no-store",
  });
  const raw: unknown = await res.json().catch(() => null);
  const data = (raw && typeof raw === "object" ? raw : null) as DashboardApiResponse | null;

  if (!res.ok || !data?.kpis) {
    throw new Error(data?.error ?? "Unable to load dashboard data.");
  }

  return data;
}

export default function Dashboard() {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const { data, error, isLoading } = useSWR<DashboardApiResponse, Error>(
    ["admin-dashboard", API] as const,
    fetchDashboard,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      revalidateOnReconnect: false,
    }
  );

  const kpis = data?.kpis ?? null;
  const attention = Array.isArray(data?.attention) ? data.attention : [];
  const recent = Array.isArray(data?.recent) ? data.recent : [];

  const cards: KpiCardConfig[] = [
    {
      key: "totalTenants",
      label: "Total tenants",
      value: isLoading && !kpis ? "–" : (kpis?.totalTenants ?? 0),
      accentHex: "#4f46e5",
      iconWrapClass: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200",
      barClass: "bg-indigo-600",
      icon: "building",
    },
    {
      key: "activeTenants",
      label: "Active tenants",
      value: isLoading && !kpis ? "–" : (kpis?.activeTenants ?? 0),
      accentHex: "#059669",
      iconWrapClass: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
      barClass: "bg-emerald-600",
      icon: "check",
    },
    {
      key: "suspendedTenants",
      label: "Suspended",
      value: isLoading && !kpis ? "–" : (kpis?.suspendedTenants ?? 0),
      accentHex: "#e11d48",
      iconWrapClass: "bg-rose-50 text-rose-600 ring-1 ring-rose-200",
      barClass: "bg-rose-600",
      icon: "activity",
    },
    {
      key: "expiringSoon",
      label: "Expiring in 30 days",
      value: isLoading && !kpis ? "–" : (kpis?.expiringSoon ?? 0),
      accentHex: "#d97706",
      iconWrapClass: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
      barClass: "bg-amber-500",
      icon: "clock",
    },
    {
      key: "platformUsers",
      label: "Platform users",
      value:
        isLoading && !kpis
          ? "–"
          : Number(kpis?.platformUsers ?? 0).toLocaleString("en-IN"),
      accentHex: "#0284c7",
      iconWrapClass: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
      barClass: "bg-sky-600",
      icon: "users",
    },
    {
      key: "revenueThisMonth",
      label: "Revenue this month",
      value:
        isLoading && !kpis
          ? "–"
          : formatINR(Number(kpis?.revenueThisMonth ?? 0)),
      accentHex: "#ea580c",
      iconWrapClass: "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
      barClass: "bg-orange-600",
      icon: "rupee",
    },
  ];

  return (
    <>
      <Topbar
        title="Platform Admin"
        subtitle="Service centres, subscriptions and revenue at a glance"
      />

      <div className="container space-y-7">
        {error && !kpis && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {error.message}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.key}
              style={{
                borderLeftWidth: "4px",
                borderLeftStyle: "solid",
                borderLeftColor: c.accentHex,
              }}
              className="card flex items-start justify-between gap-4 p-5"
            >
              <div>
                <p className="text-sm font-medium text-slate-500">{c.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {c.value}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconWrapClass}`}
                >
                  {renderKpiIcon(c.icon)}
                </span>
                <span aria-hidden className={`h-1.5 w-6 rounded-full ${c.barClass}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Subscriptions needing attention
                </h2>
                <p className="muted mt-1 text-sm">
                  Expired or ending within 30 days
                </p>
              </div>
              <Link
                href="/admin/tenants"
                className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                Manage <ArrowRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {!isLoading && attention.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500">
                  All subscriptions are healthy.
                </p>
              )}

              {attention.map((tenant) => {
                const left =
                  nowMs !== null
                    ? daysUntilExpiry(tenant.subscriptionExpiresAt, nowMs)
                    : null;
                const isExpired = left !== null && left < 0;
                const badgeTone = isExpired ? "red" : "yellow";
                const badgeText =
                  left === null
                    ? formatDate(tenant.subscriptionExpiresAt)
                    : left < 0
                      ? `Expired ${Math.abs(left)} day${Math.abs(left) === 1 ? "" : "s"} ago`
                      : left === 0
                        ? "Ends today"
                        : `${left} day${left === 1 ? "" : "s"} left`;

                return (
                  <div
                    key={tenant.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="min-w-40">
                      <p className="font-bold text-slate-900">{tenant.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {tenant.plan || "Plan"} · ends{" "}
                        {formatDate(tenant.subscriptionExpiresAt)}
                      </p>
                    </div>
                    <Badge tone={badgeTone}>{badgeText}</Badge>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Recently added tenants
                </h2>
                <p className="muted mt-1 text-sm">
                  Latest service centres on the platform
                </p>
              </div>
              <Link
                href="/admin/tenants"
                className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                All tenants <ArrowRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {!isLoading && recent.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500">
                  No service centres added yet.
                </p>
              )}

              {recent.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <div className="min-w-40">
                    <p className="font-bold text-slate-900">{tenant.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {tenant.owner || "—"} · joined{" "}
                      {formatDate(tenant.createdAt)}
                    </p>
                  </div>
                  <Badge tone={tenant.status === "Active" ? "green" : "gray"}>
                    {tenant.status}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}