"use client";

import { useEffect, useState } from "react";
import Topbar from "../../../components/navbar/Topbar";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import AddStaffForm, { type NewStaff } from "../../../components/owner/AddStaffForm";
import WhatsAppCredentialsModal from "../../../components/admin/WhatsAppCredentialsModal";
import { generateTempPassword } from "../../../lib/tempPassword";
import { createAccount, removeAccount } from "../../../lib/tenantAccounts";
import { ymd } from "../../../lib/revenue";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { restoreStaff, store, useAppSelector, type StaffMember } from "../../../lib/redux-store";

type Filter = "all" | "Manager" | "staff";
type Credentials = { owner: string; centre: string; mobile: string; password: string; staffRole: string; reset: boolean };

const tabs: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Manager", label: "Managers" },
  { value: "staff", label: "Staff / Drivers" },
];

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function MyStaff() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const allStaff = useAppSelector((s) => s.staff);
  const tenants = useAppSelector((s) => s.tenants);

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  useEffect(() => restoreStaff(), []);

  const mine = allStaff.filter((m) => m.tenantId === tenant?.id);
  const shown = mine.filter((m) => filter === "all" || m.role === filter);
  // A mobile number can belong to only one account on the whole platform.
  const takenMobiles = [...tenants.flatMap((t) => (t.mobile ? [t.mobile] : [])), ...allStaff.map((m) => m.mobile)];

  /** Same flow as the admin creating an owner: add, one temporary password shown once, send on WhatsApp. */
  async function createStaff(data: NewStaff) {
    if (!tenant) return;
    const latest = allStaff.reduce((max, m) => Math.max(max, Number(m.id.replace(/\D/g, "")) || 0), 0);
    store.dispatch({
      type: "staff/added",
      payload: {
        id: `STF${String(latest + 1).padStart(3, "0")}`,
        tenantId: tenant.id,
        name: data.name,
        mobile: data.mobile,
        email: data.email || undefined,
        role: data.role,
        status: "Active",
        createdAt: ymd(new Date()),
      },
    });
    // Keep the tenant's user count (shown to the admin) in step.
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: tenant.users + 1 } });
    setShowForm(false);
    // Same as the admin creating an owner: a login with a temporary password that must be changed on first sign-in.
    const password = generateTempPassword();
    await createAccount({ mobile: data.mobile, email: data.email || undefined, name: data.name, role: data.role === "staff" ? "staff" : "manager", tenantId: tenant.id, password });
    setCredentials({ owner: data.name, centre: tenant.name, mobile: data.mobile, password, staffRole: data.role === "staff" ? "Staff (Driver)" : "Manager", reset: false });
  }

  function toggleStatus(m: StaffMember) {
    const next = m.status === "Active" ? "Suspended" : "Active";
    store.dispatch({ type: "staff/updated", payload: { ...m, status: next } });
    setNotice({ tone: "ok", text: `${m.name} is now ${next.toLowerCase()}.${next === "Suspended" ? " They can no longer sign in." : ""}` });
  }

  async function resetPassword(m: StaffMember) {
    if (!tenant) return;
    // Replaces the login with a new temporary password; they must change it again on next sign-in.
    const password = generateTempPassword();
    await createAccount({ mobile: m.mobile, email: m.email, name: m.name, role: m.role === "staff" ? "staff" : "manager", tenantId: tenant.id, password });
    setCredentials({ owner: m.name, centre: tenant.name, mobile: m.mobile, password, staffRole: m.role, reset: true });
  }

  function remove(m: StaffMember) {
    if (!tenant || !window.confirm(`Remove ${m.name}? They will no longer be able to sign in.`)) return;
    store.dispatch({ type: "staff/deleted", payload: m.id });
    removeAccount(m.mobile);
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: Math.max(1, tenant.users - 1) } });
    setNotice({ tone: "ok", text: `${m.name} was removed.` });
  }

  const count = (f: Filter) => (f === "all" ? mine.length : mine.filter((m) => m.role === f).length);

  return (
    <>
      <Topbar title="My Staff" subtitle="Add and manage your managers and staff" />
      <div className="container">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Staff filters">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={filter === t.value}
                onClick={() => setFilter(t.value)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === t.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {t.label} <span className="opacity-70">{count(t.value)}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close form" : "Add manager / staff"}</Button>
        </div>

        {notice && (
          <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {showForm && <AddStaffForm existingMobiles={takenMobiles} onCreate={createStaff} onCancel={() => setShowForm(false)} />}

        <DataTable
          headers={["Name", "Role", "Mobile", "Joined", "Status", "Action"]}
          rows={shown.map((m) => [
            <b key="n">{m.name}</b>,
            m.role === "staff" ? "Staff / Driver" : "Manager",
            m.mobile,
            fmt(m.createdAt),
            <Badge key="s" tone={m.status === "Active" ? "green" : "red"}>{m.status}</Badge>,
            <div key="a" className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => toggleStatus(m)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${m.status === "Active" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{m.status === "Active" ? "Suspend" : "Activate"}</button>
              <button type="button" onClick={() => resetPassword(m)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Reset password</button>
              <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Remove</button>
            </div>,
          ])}
        />
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            {mine.length === 0 ? "No staff yet. Add your first manager or staff member." : "No one matches this filter."}
          </p>
        )}
      </div>
      {credentials && <WhatsAppCredentialsModal {...credentials} variant="staff" onClose={() => setCredentials(null)} />}
    </>
  );
}