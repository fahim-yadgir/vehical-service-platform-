"use client";
import Link from "next/link";
import { X, MapPin, Phone, Clock, Star } from "lucide-react";
import Badge from "../ui/Badge";
import { tenantHeadcount, useAppSelector, type Tenant } from "../../lib/redux-store";
import { useLiveCenters } from "../../lib/liveCenters";

const DAY = 24 * 60 * 60 * 1000;
const fmt = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });


export function subscriptionState(t: Tenant) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const left = Math.ceil((new Date(`${t.subscriptionExpiresAt}T00:00:00`).getTime() - today.getTime()) / DAY);
  return { left, expired: left < 0 };
}

type Props = {
  tenant: Tenant;
  onClose: () => void;
  onToggleStatus: (t: Tenant) => void;
  onManage: (t: Tenant) => void;
};

export default function TenantDetailsModal({ tenant, onClose, onToggleStatus, onManage }: Props) {
  const { left, expired } = subscriptionState(tenant);
  const { centers } = useLiveCenters();
  const staffList = useAppSelector((state) => state.staff);
  const head = tenantHeadcount(staffList, tenant.id);
  const center = centers.find((c) => c.id === tenant.id); 
  const isActive = tenant.status === "Active";
  const liveOnApp = isActive && !expired && !!center;

  const rows: [string, React.ReactNode][] = [
    ["Tenant ID", <span key="id" className="font-mono">{tenant.id}</span>],
    ["Owner", tenant.owner],
    ["Mobile", tenant.mobile ?? "–"],
    ["Email", tenant.email ?? "–"],
    ["Users", `${head.total} (1 owner, ${head.managers} manager${head.managers === 1 ? "" : "s"}, ${head.staff} staff)`],
    ["Joined", fmt(tenant.createdAt)],
    ["Plan", tenant.plan],
    ["Subscription ends", fmt(tenant.subscriptionExpiresAt)],
    [
      "Subscription",
      <Badge key="sub" tone={expired ? "red" : left <= 30 ? "yellow" : "green"}>
        {expired ? `Expired ${-left} day${left === -1 ? "" : "s"} ago` : `${left} day${left === 1 ? "" : "s"} left`}
      </Badge>,
    ],
    ["Visible to customers", <Badge key="live" tone={liveOnApp ? "green" : "gray"}>{liveOnApp ? "Yes, live" : "No"}</Badge>],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${tenant.name} details`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">{tenant.name}</h3>
            <div className="mt-2"><Badge tone={isActive ? "green" : "red"}>{tenant.status}</Badge></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

              <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">Customer-facing profile</p>
          {center ? (
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-orange-500" />{center.address}</p>
              <p className="flex items-center gap-2"><Phone size={15} className="shrink-0 text-orange-500" />{center.phone}</p>
              <p className="flex items-center gap-2"><Clock size={15} className="shrink-0 text-orange-500" />{center.hours}</p>
              <p className="flex items-center gap-2"><Star size={15} className="shrink-0 text-amber-500" />New on AutoServe · {center.services.length} services listed</p>
              <p className="text-xs text-slate-500">{center.services.join(" · ")}</p>
              <Link href={`/customer/serviceCenters/${center.id}`} className="inline-block text-xs font-bold text-orange-600 hover:text-orange-700">
                Open public profile →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not visible to customers yet. The owner must complete the profile (address and map pin) and the plan must be active.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => onManage(tenant)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Manage
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(tenant)}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${isActive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isActive ? "Suspend tenant" : "Activate tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}