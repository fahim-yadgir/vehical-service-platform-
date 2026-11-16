"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import DataTable from "../../../components/tables/DataTable";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import AddStaffForm, { type NewStaff } from "../../../components/owner/AddStaffForm";
import WhatsAppCredentialsModal from "../../../components/admin/WhatsAppCredentialsModal";
import { generateTempPassword } from "../../../lib/tempPassword";
import { createAccount, removeAccount, updateAccountProfile } from "../../../lib/tenantAccounts";
import { isEmail } from "../../../lib/validators";
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

  // State for staff removal/delete confirmation popup
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);
  // The member whose Edit popup is open (read from the store so Suspend/Activate shows right away)
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => restoreStaff(), []);

  const mine = allStaff.filter((m) => m.tenantId === tenant?.id);
  const shown = mine.filter((m) => filter === "all" || m.role === filter);
  const takenMobiles = [...tenants.flatMap((t) => (t.mobile ? [t.mobile] : [])), ...allStaff.map((m) => m.mobile)];
  const editing = mine.find((m) => m.id === editingId) ?? null;

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
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: tenant.users + 1 } });
    setShowForm(false);
    const password = generateTempPassword();
    await createAccount({ mobile: data.mobile, email: data.email || undefined, name: data.name, role: data.role === "staff" ? "staff" : "manager", tenantId: tenant.id, password });
    setCredentials({ owner: data.name, centre: tenant.name, mobile: data.mobile, password, staffRole: data.role === "staff" ? "Staff (Driver)" : "Manager", reset: false });
  }

  function saveDetails(m: StaffMember, changes: { name: string; email?: string }) {
    store.dispatch({ type: "staff/updated", payload: { ...m, name: changes.name, email: changes.email } });
    updateAccountProfile(m.mobile, changes); // the login shows the same name and email
    setEditingId(null);
    setNotice({ tone: "ok", text: `${changes.name}'s details were saved.` });
  }

  function toggleStatus(m: StaffMember) {
    const next = m.status === "Active" ? "Suspended" : "Active";
    store.dispatch({ type: "staff/updated", payload: { ...m, status: next } });
    setNotice({ tone: "ok", text: `${m.name} is now ${next.toLowerCase()}.${next === "Suspended" ? " They can no longer sign in." : ""}` });
  }

  async function resetPassword(m: StaffMember) {
    if (!tenant) return;
    const password = generateTempPassword();
    await createAccount({ mobile: m.mobile, email: m.email, name: m.name, role: m.role === "staff" ? "staff" : "manager", tenantId: tenant.id, password });
    setEditingId(null);
    setCredentials({ owner: m.name, centre: tenant.name, mobile: m.mobile, password, staffRole: m.role, reset: true });
  }

  function confirmRemoveStaff() {
    if (!tenant || !staffToRemove) return;
    const m = staffToRemove;
    store.dispatch({ type: "staff/deleted", payload: m.id });
    removeAccount(m.mobile);
    store.dispatch({ type: "tenants/updated", payload: { ...tenant, users: Math.max(1, tenant.users - 1) } });
    setNotice({ tone: "ok", text: `${m.name} was removed.` });
    setStaffToRemove(null);
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
          <div
            role="status"
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          >
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
              <button type="button" onClick={() => setEditingId(m.id)} aria-label={`Edit ${m.name}`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">Edit</button>
              <button type="button" onClick={() => setStaffToRemove(m)} aria-label={`Remove ${m.name}`} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Remove</button>
            </div>,
          ])}
        />
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            {mine.length === 0 ? "No staff yet. Add your first manager or staff member." : "No one matches this filter."}
          </p>
        )}
      </div>

      {/* Edit popup: details, Suspend / Activate and Reset password */}
      {editing && (
        <EditStaffModal
          key={editing.id}
          member={editing}
          onClose={() => setEditingId(null)}
          onSave={(changes) => saveDetails(editing, changes)}
          onToggleStatus={() => toggleStatus(editing)}
          onResetPassword={() => resetPassword(editing)}
        />
      )}

      {/* Custom Staff Removal Confirmation Modal */}
      {staffToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Remove staff confirmation" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Remove staff member</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">{staffToRemove.name}</strong>? They will no longer be able to sign in.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStaffToRemove(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveStaff}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {credentials && <WhatsAppCredentialsModal {...credentials} variant="staff" onClose={() => setCredentials(null)} />}
    </>
  );
}

type EditProps = {
  member: StaffMember;
  onClose: () => void;
  onSave: (changes: { name: string; email?: string }) => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
};

function EditStaffModal({ member, onClose, onSave, onToggleStatus, onResetPassword }: EditProps) {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email ?? "");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName) return setError("Enter the name.");
    if (cleanEmail && !isEmail(cleanEmail)) return setError("Enter a valid email address.");
    onSave({ name: cleanName, email: cleanEmail || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${member.name}`}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Edit {member.role === "staff" ? "staff / driver" : "manager"}</h3>
            <div className="mt-2">
              <Badge tone={member.status === "Active" ? "green" : "red"}>{member.status}</Badge>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Name</span>
            <input
              className="input"
              maxLength={32}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Email (optional)</span>
            <input
              type="email"
              className="input"
              value={email}
              placeholder="name@example.com"
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />
          </label>
          <div>
            <p className="text-sm font-bold text-slate-700">Mobile (login)</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{member.mobile}</p>
            <p className="muted mt-1 text-xs">The mobile number is the login, so it cannot be changed here.</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
          <Button type="submit">Save changes</Button>
        </form>

        <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="muted max-w-[14rem] text-xs">
              {member.status === "Active" ? "A suspended person cannot sign in." : "Activating lets this person sign in again."}
            </p>
            <button
              type="button"
              onClick={onToggleStatus}
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${member.status === "Active" ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
            >
              {member.status === "Active" ? "Suspend" : "Activate"}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="muted max-w-[14rem] text-xs">Creates a new temporary password and sends it on WhatsApp.</p>
            <button type="button" onClick={onResetPassword} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Reset password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}