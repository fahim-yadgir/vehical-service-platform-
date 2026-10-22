"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, ShieldCheck } from "lucide-react";
import Topbar from "../../../../components/navbar/Topbar";
import Button from "../../../../components/ui/Button";
import PasswordInput from "../../../../components/ui/PasswordInput";
import { clearSession, roleLabels } from "../../../../lib/auth";

/** At least 8 characters, with a letter and a number. */
const strongEnough = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export default function AdminProfile() {
  const router = useRouter();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    setError("");
    setDone(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!strongEnough(form.next)) return setError("New password must be at least 8 characters and include a letter and a number.");
    if (form.next === form.current) return setError("New password must be different from the current password.");
    if (form.next !== form.confirm) return setError("New password and confirm password do not match.");
    // Backend later: send current + new password to the API, which checks the current one.
    setForm({ current: "", next: "", confirm: "" });
    setDone(true);
  };

  const logout = () => {
    clearSession();
    router.push("/admin/login");
  };

  return (
    <>
      <Topbar title="Profile" subtitle="Your admin account and security" />
      <div className="container space-y-5 md:!pl-6">
        <div className="card mx-auto flex max-w-xl items-center gap-4 p-5">
          <div className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-orange-400">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">{roleLabels.admin}</h2>
            <p className="text-sm text-slate-500">Full access to tenants, users and revenue</p>
          </div>
        </div>

        <form onSubmit={submit} className="card mx-auto max-w-xl space-y-4 p-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Change password</h3>
            <p className="mt-1 text-sm text-slate-500">Use at least 8 characters with a letter and a number.</p>
          </div>

          <PasswordInput label="Current password" value={form.current} onChange={set("current")} autoComplete="current-password" required />
          <PasswordInput label="New password" value={form.next} onChange={set("next")} autoComplete="new-password" required />
          <PasswordInput label="Confirm new password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />

          {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
          {done && (
            <p role="status" className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={16} /> Password changed successfully.
            </p>
          )}

          <Button type="submit">Update password</Button>
        </form>

        <div className="card mx-auto flex max-w-xl items-center justify-between gap-4 p-5">
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