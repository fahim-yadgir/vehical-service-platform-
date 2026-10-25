"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import Button from "../ui/Button";
import PasswordInput from "../ui/PasswordInput";
import { changePassword, getSessionAccount, verifyPassword } from "../../lib/tenantAccounts";

/** At least 8 characters, with a letter and a number. */
const strongEnough = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export default function ChangePasswordCard() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    setError("");
    setDone(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!strongEnough(form.next)) return setError("New password must be at least 8 characters and include a letter and a number.");
    if (form.next === form.current) return setError("New password must be different from the current password.");
    if (form.next !== form.confirm) return setError("New password and confirm password do not match.");
    setSaving(true);
    // Demo logins have no saved account, so there is nothing to check or store for them.
    const account = getSessionAccount();
    if (account) {
      if (!(await verifyPassword(account, form.current))) {
        setSaving(false);
        return setError("Current password is incorrect.");
      }
      await changePassword(account.mobile, form.next);
    }
    setSaving(false);
    setForm({ current: "", next: "", confirm: "" });
    setDone(true);
  };

  return (
    <form onSubmit={submit} className="card max-w-3xl space-y-4 p-6">
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
      <Button type="submit" loading={saving}>Update password</Button>
    </form>
  );
}