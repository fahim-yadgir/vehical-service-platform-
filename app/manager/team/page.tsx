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
import { isClosed, restoreOrders, useOrders } from "../../../lib/orders";

type Credentials = { owner: string; centre: string; mobile: string; password: string; staffRole: string; reset: boolean };

const fmt = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function ManagerStaff() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const allStaff = useAppSelector((s) => s.staff);
  const tenants = useAppSelector((s) => s.tenants);
  const orders = useOrders();

  const [showForm, setShowForm] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  // A manager looks after staff (drivers) only, never other managers.
  const mine = allStaff.filter((m) => m.tenantId === tenant?.id && m.role === "staff");
  // A mobile number can belong to only one account on the whole platform.
  const takenMobiles = [...tenants.flatMap((t) => (t.mobile ? [t.mobile] : [])), ...allStaff.map((m) => m.mobile)];
  const openOrders = (id: string) =>
    orders.filter((o) => o.assignedStaffId === id && !isClosed(o.status)).length;

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
        role: "staff", // always staff, whatever the form says
        status: "Active",
        createdAt: ymd(new Date()),
      },
    });
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: tenant.users + 1 } });
    setShowForm(false);
    // A login with a temporary password that must be changed on first sign-in.
    const password = generateTempPassword();
    await createAccount({ mobile: data.mobile, email: data.email || undefined, name: data.name, role: "staff", tenantId: tenant.id, password });
    setCredentials({ owner: data.name, centre: tenant.name, mobile: data.mobile, password, staffRole: "Staff (Driver)", reset: false });
  }

  function toggleStatus(m: StaffMember) {
    if (m.role !== "staff") return;
    const next = m.status === "Active" ? "Suspended" : "Active";
    store.dispatch({ type: "staff/updated", payload: { ...m, status: next } });
    setNotice(`${m.name} is now ${next.toLowerCase()}.${next === "Suspended" ? " They can no longer sign in." : ""}`);
  }

  async function resetPassword(m: StaffMember) {
    if (!tenant || m.role !== "staff") return;
    const password = generateTempPassword();
    await createAccount({ mobile: m.mobile, email: m.email, name: m.name, role: "staff", tenantId: tenant.id, password });
    setCredentials({ owner: m.name, centre: tenant.name, mobile: m.mobile, password, staffRole: "Staff (Driver)", reset: true });
  }

  function remove(m: StaffMember) {
    if (!tenant || m.role !== "staff") return;
    const open = openOrders(m.id);
    const extra = open ? ` They have ${open} open order(s), which will need a new staff member.` : "";
    if (!window.confirm(`Remove ${m.name}? They will no longer be able to sign in.${extra}`)) return;
    store.dispatch({ type: "staff/deleted", payload: m.id });
    removeAccount(m.mobile);
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: Math.max(1, tenant.users - 1) } });
    setNotice(`${m.name} was removed.`);
  }

  return (
    <>
      <Topbar title="Staff" subtitle="Add and manage your service centre's staff" />
      <div className="container">
        <div className="mb-5 flex justify-end">
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close form" : "Add staff"}</Button>
        </div>

        {notice && (
          <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {showForm && (
          <AddStaffForm roles={["staff"]} existingMobiles={takenMobiles} onCreate={createStaff} onCancel={() => setShowForm(false)} />
        )}

        <DataTable
          headers={["Name", "Mobile", "Joined", "Open orders", "Status", "Action"]}
          rows={mine.map((m) => [
            <b key="n">{m.name}</b>,
            m.mobile,
            fmt(m.createdAt),
            String(openOrders(m.id)),
            <Badge key="s" tone={m.status === "Active" ? "green" : "red"}>{m.status}</Badge>,
            <div key="a" className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleStatus(m)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  m.status === "Active"
                    ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {m.status === "Active" ? "Suspend" : "Activate"}
              </button>
              <button type="button" onClick={() => resetPassword(m)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Reset password
              </button>
              <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">
                Remove
              </button>
            </div>,
          ])}
        />
        {mine.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No staff yet. Add your first staff member.</p>
        )}
      </div>
      {credentials && <WhatsAppCredentialsModal {...credentials} variant="staff" onClose={() => setCredentials(null)} />}
    </>
  );
}