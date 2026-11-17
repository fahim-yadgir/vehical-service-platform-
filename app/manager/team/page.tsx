"use client";

import { useEffect, useState } from "react";
import Topbar from "../../../components/navbar/Topbar";
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
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    restoreStaff();
    restoreOrders();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setOpenDropdownId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const mine = allStaff.filter((m) => m.tenantId === tenant?.id && m.role === "staff");
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
        role: "staff",
        status: "Active",
        createdAt: ymd(new Date()),
      },
    });
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: tenant.users + 1 } });
    setShowForm(false);
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

  function confirmRemoveStaff() {
    if (!tenant || !staffToRemove || staffToRemove.role !== "staff") return;
    const m = staffToRemove;
    store.dispatch({ type: "staff/deleted", payload: m.id });
    removeAccount(m.mobile);
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: Math.max(1, tenant.users - 1) } });
    setNotice(`${m.name} was removed.`);
    setStaffToRemove(null);
  }

  const openCount = staffToRemove ? openOrders(staffToRemove.id) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <Topbar title="Staff" subtitle="Manage your service centre staff and team assignments" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">Team Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">Active staff members and delivery drivers assigned to your service centre.</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} className="shadow-sm">
            {showForm ? "Close Form" : "+ Add Staff"}
          </Button>
        </div>

        {notice && (
          <div role="status" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm font-medium text-emerald-900 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-emerald-700 hover:text-emerald-900 font-bold text-lg leading-none">×</button>
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <AddStaffForm roles={["staff"]} existingMobiles={takenMobiles} onCreate={createStaff} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Mobile</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6">Open Orders</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {mine.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{m.name}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">{m.mobile}</td>
                    <td className="py-4 px-6 text-slate-600 text-xs">{fmt(m.createdAt)}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${openOrders(m.id) > 0 ? "bg-amber-50 text-amber-700 border border-amber-200/60" : "bg-slate-100 text-slate-600"}`}>
                        {openOrders(m.id)} active
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge tone={m.status === "Active" ? "green" : "red"}>{m.status}</Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center justify-end gap-2 relative">
                        {/* Edit Dropdown Button */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                          >
                            <span>Edit</span>
                            <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${openDropdownId === m.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {openDropdownId === m.id && (
                            <div className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  toggleStatus(m);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${m.status === "Active" ? "bg-rose-500" : "bg-emerald-500"}`} />
                                {m.status === "Active" ? "Suspend Account" : "Activate Account"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  resetPassword(m);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                              >
                                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Reset Password
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => setStaffToRemove(m)}
                          aria-label={`Remove ${m.name}`}
                          className="inline-flex items-center rounded-xl border border-rose-200/80 bg-rose-50/30 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mine.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No staff members found</p>
              <p className="text-xs text-slate-500 mt-0.5">Get started by adding your first staff member to the team.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {staffToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-label="Remove staff confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Remove Staff Member</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 font-semibold">{staffToRemove.name}</strong>? They will instantly lose access and be unable to sign in to the platform.
              {openCount > 0 && (
                <span className="mt-2 block rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-amber-800 font-medium">
                  ⚠️ This user has <strong className="font-bold">{openCount}</strong> open order(s) assigned. You will need to reassign them.
                </span>
              )}
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStaffToRemove(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveStaff}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition-colors"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {credentials && <WhatsAppCredentialsModal {...credentials} variant="staff" onClose={() => setCredentials(null)} />}
    </div>
  );
}