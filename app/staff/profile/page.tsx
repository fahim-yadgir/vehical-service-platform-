"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import ChangePasswordCard from "../../../components/auth/ChangePasswordCard";
import { clearSession } from "../../../lib/auth";
import { clearOwnerTenantId } from "../../../lib/ownerTenant";
import { useOwnerProfile } from "../../../lib/ownerProfile";
import { getSessionAccount, updateAccountProfile } from "../../../lib/tenantAccounts";
import { store } from "../../../lib/redux-store";
import { useStaffWorkspace } from "../../../lib/staffSession";
import { isEmail } from "../../../lib/validators";

function ReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={value || "—"} readOnly className="input cursor-not-allowed bg-slate-50 text-slate-500" />
    </label>
  );
}

export default function StaffProfilePage() {
  const router = useRouter();
  const { me, tenant } = useStaffWorkspace();
  const { profile } = useOwnerProfile(tenant?.id);

  const [form, setForm] = useState({ name: "", email: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) setForm({ name: me.name, email: me.email ?? "" });
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: "name" | "email", value: string) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: undefined });
    setSaved(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const account = getSessionAccount();
    if (!me || !account) return;
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Enter your name.";
    if (form.email.trim() && !isEmail(form.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const name = form.name.trim();
    const email = form.email.trim() || undefined;
    updateAccountProfile(account.mobile, { name, email });
    // keep the staff list (what the owner and manager see) in step
    store.dispatch({ type: "staff/updated", payload: { ...me, name, email } });
    setSaved(true);
  };

  const logout = () => {
    clearSession();
    clearOwnerTenantId();
    router.push("/login");
  };

  const address = profile ? [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(", ") : "";

  return (
    <>
      <Topbar title="Profile" subtitle="Your details and your service centre" />
      <div className="container space-y-5">
        <section className="card max-w-3xl space-y-4 p-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Service centre</h2>
            <p className="mt-1 text-sm text-slate-500">Only the owner can change these details.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label="Service centre name" value={tenant?.name} />
            <ReadOnly label="Owner" value={tenant?.owner} />
            <ReadOnly label="GST number" value={profile?.gstin} />
            <ReadOnly label="Your role" value="Staff / Driver" />
            <div className="sm:col-span-2">
              <ReadOnly label="Address" value={address} />
            </div>
          </div>
        </section>

        <form onSubmit={submit} noValidate className="card max-w-3xl space-y-4 p-6">
          <h2 className="text-lg font-black text-slate-900">Your details</h2>
          {saved && (
            <p role="status" className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={16} /> Details saved.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Full name</span>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input" aria-invalid={!!errors.name} />
              {errors.name && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.name}</span>}
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" aria-invalid={!!errors.email} />
              {errors.email && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.email}</span>}
            </label>
            <ReadOnly label="Mobile number (login)" value={me?.mobile} />
            <ReadOnly label="Joined" value={me?.createdAt} />
          </div>
          <Button type="submit">Save details</Button>
        </form>

        <ChangePasswordCard />

        <div className="card flex max-w-3xl items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-black text-slate-900">Log out</h3>
            <p className="text-sm text-slate-500">Sign out of this device.</p>
          </div>
          <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </>
  );
}