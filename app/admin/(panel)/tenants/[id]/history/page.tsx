"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "@/components/navbar/Topbar";
import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { formatDate, formatINR, ymd } from "@/lib/revenue";
import { restoreTenants, useAppSelector } from "@/lib/redux-store";
import { amountLabel, payDateLabel, recordStatus, tenantHistory } from "@/lib/subscriptionHistory";

export default function TenantSubscriptionHistory() {
  const { id } = useParams<{ id: string }>();
  const tenants = useAppSelector((s) => s.tenants);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreTenants();
    setReady(true);
  }, []);

  const tenant = tenants.find((t) => t.id === id);

  if (!ready) {
    return (
      <>
        <Topbar title="Subscription history" subtitle="Loading…" />
        <div className="container" />
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <Topbar title="Tenant not found" subtitle="This service centre does not exist or was deleted" />
        <div className="container">
          <Link href="/admin/tenants" className="btn btn-secondary">← Back to tenants</Link>
        </div>
      </>
    );
  }

  const records = tenantHistory(tenant);
  const today = ymd(new Date());
  const totalPaid = records.reduce((sum, r) => sum + (r.plan === "Free Trial" ? 0 : r.amount), 0);
  const tone = { Active: "green", Upcoming: "yellow", Ended: "gray" } as const;

  return (
    <>
      <Topbar title="Subscription history" subtitle={`Every plan taken by ${tenant.name}`} />
      <div className="container space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/tenants/${tenant.id}`} className="btn btn-secondary">← Back to {tenant.name}</Link>
          <Link href="/admin/tenants" className="btn btn-secondary">All tenants</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="muted text-xs">Current plan</p>
            <p className="mt-1 text-xl font-black">{tenant.plan}</p>
            <p className="muted mt-1 text-xs">Until {formatDate(tenant.subscriptionExpiresAt)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="muted text-xs">Plans taken</p>
            <p className="mt-1 text-xl font-black">{records.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="muted text-xs">Total paid</p>
            <p className="mt-1 text-xl font-black">{formatINR(totalPaid)}</p>
          </div>
        </div>

        <DataTable
          pageSize={10}
          headers={["Plan", "Amount", "Pay date", "From", "Until", "Status"]}
          exportName={`${tenant.name}-subscription-history`}
          rows={records.map((r) => {
            const status = recordStatus(r, today);
            return [
              <b key="plan">{r.plan}</b>,
              amountLabel(r),
              payDateLabel(r),
              formatDate(r.startsOn),
              formatDate(r.endsOn),
              <Badge key="status" tone={tone[status]}>{status}</Badge>,
            ];
          })}
        />

        {!tenant.subscriptionHistory?.length && (
          <p className="muted text-xs">
            This centre was added before the history existed, so only its current plan is listed. Every renewal or plan
            change from now on is saved here.
          </p>
        )}
      </div>
    </>
  );
}