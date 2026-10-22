"use client";
import { X } from "lucide-react";
import Badge from "../ui/Badge";
import type { PlatformUser } from "../../lib/mockUsers";

const fmt = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Props = { user: PlatformUser; blocked: boolean; onClose: () => void; onToggleBlock: (u: PlatformUser) => void };

export default function UserDetailsModal({ user, blocked, onClose, onToggleBlock }: Props) {
  const rows: [string, React.ReactNode][] = [
    ["User ID", <span key="id" className="font-mono">{user.id}</span>],
    ["Role", user.role],
    ["Mobile", user.mobile],
    ["Email", user.email],
    [user.role === "Customer" ? "Last used centre" : "Tenant", user.tenant],
    ["Joined", fmt(user.joined)],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${user.name} details`} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">{user.name}</h3>
            <div className="mt-2"><Badge tone={blocked ? "red" : "green"}>{blocked ? "Blocked" : "Active"}</Badge></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="break-all text-right font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button type="button" onClick={() => onToggleBlock(user)} className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${blocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
            {blocked ? "Unblock user" : "Block user"}
          </button>
        </div>
      </div>
    </div>
  );
}