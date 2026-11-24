"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "@/components/navbar/Topbar";
import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";

type HistoryItem = {
  id: string;
  planId: string | null;
  plan: string;
  amount: number;
  payDate: string;
  startsOn: string;
  endsOn: string;
};

type HistoryTenantInfo = {
  id: string;
  name: string;
};

type HistoryApiResponse = {
  tenant?: HistoryTenantInfo;
  history?: HistoryItem[];
  error?: string;
};

const API = `${process.env.NEXT_PUBLIC_APP_URL}`;

function formatIsoDate(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(item: HistoryItem): string {
  if (item.plan === "Free Trial" || item.amount === 0) return "Free";
  return `₹${Math.round(item.amount).toLocaleString("en-IN")}`;
}

function getRecordStatus(item: HistoryItem, nowMs: number): "Active" | "Upcoming" | "Ended" {
  const startMs = new Date(item.startsOn).getTime();
  const endMs = new Date(item.endsOn).getTime();

  if (!Number.isNaN(startMs) && nowMs < startMs) return "Upcoming";
  if (!Number.isNaN(endMs) && nowMs > endMs) return "Ended";
  return "Active";
}

export default function TenantSubscriptionHistory() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<HistoryTenantInfo | null>(null);
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!id) {
        if (active) {
          setTenantInfo(null);
          setRecords([]);
          setFetchError("Invalid tenant id");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const res = await fetch(`${API}/api/admin/tenants/${encodeURIComponent(id)}/history`, {
          method: "GET",
          cache: "no-store",
        });

        const raw: unknown = await res.json().catch(() => null);
        const data = (raw && typeof raw === "object" ? raw : null) as HistoryApiResponse | null;

        if (!active) return;

        if (!res.ok || !data?.tenant) {
          setTenantInfo(null);
          setRecords([]);
          setFetchError(data?.error ?? "This service centre does not exist or was deleted");
          setLoading(false);
          return;
        }

        setTenantInfo(data.tenant);
        setRecords(Array.isArray(data.history) ? data.history : []);
        setLoading(false);
      } catch {
        if (!active) return;
        setTenantInfo(null);
        setRecords([]);
        setFetchError("Unable to load subscription history right now.");
        setLoading(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <Topbar title="Subscription history" subtitle="Loading…" />
        <div className="container" />
      </>
    );
  }

  if (!tenantInfo) {
    return (
      <>
        <Topbar
          title="Tenant not found"
          subtitle={fetchError ?? "This service centre does not exist or was deleted"}
        />
        <div className="container">
          <Link href="/admin/tenants" className="btn btn-secondary">← Back to tenants</Link>
        </div>
      </>
    );
  }

  const latest = records[0] ?? null;
  const nowMs = Date.now();
  const totalPaid = records.reduce(
    (sum, r) => sum + (r.plan === "Free Trial" ? 0 : Number(r.amount) || 0),
    0
  );
  const tone = { Active: "green", Upcoming: "yellow", Ended: "gray" } as const;

  return (
    <>
      <Topbar title="Subscription history" subtitle={`Every plan taken by ${tenantInfo.name}`} />
      <div className="container space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/tenants/${tenantInfo.id}`} className="btn btn-secondary">
            ← Back to {tenantInfo.name}
          </Link>
          <Link href="/admin/tenants" className="btn btn-secondary">All tenants</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="muted text-xs">Current plan</p>
            <p className="mt-1 text-xl font-black">{latest?.plan || "—"}</p>
            <p className="muted mt-1 text-xs">
              {latest?.endsOn ? `Until ${formatIsoDate(latest.endsOn)}` : "No active plan"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="muted text-xs">Plans taken</p>
            <p className="mt-1 text-xl font-black">{records.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="muted text-xs">Total paid</p>
            <p className="mt-1 text-xl font-black">{`₹${Math.round(totalPaid).toLocaleString("en-IN")}`}</p>
          </div>
        </div>

        <DataTable
          pageSize={10}
          headers={["Plan", "Amount", "Pay date", "From", "Until", "Status"]}
          exportName={`${tenantInfo.name}-subscription-history`}
          rows={records.map((r) => {
            const status = getRecordStatus(r, nowMs);
            return [
              <b key="plan">{r.plan}</b>,
              formatAmount(r),
              formatIsoDate(r.payDate),
              formatIsoDate(r.startsOn),
              formatIsoDate(r.endsOn),
              <Badge key="status" tone={tone[status]}>{status}</Badge>,
            ];
          })}
        />

        {!records.length && (
          <p className="muted text-xs">
            No subscription history records found for this centre yet. Every renewal or plan change is saved here.
          </p>
        )}
      </div>
    </>
  );
}