"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import Button from "../ui/Button";
import PasswordInput from "../ui/PasswordInput";
import { clearSession } from "../../lib/auth";
import { changePassword, clearAccountSession, getSessionAccount, type TenantAccount } from "../../lib/tenantAccounts";

/** Full-screen popup shown after the first login with a temporary password. It cannot be closed without changing the password. */
export default function ForcePasswordChange() {
  const router = useRouter();
  const [account, setAccount] = useState<TenantAccount | null>(null);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const a = getSessionAccount();
    if (a?.mustChangePassword) setAccount(a);
  }, []);

  if (!account) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return setError("Password must be at least 8 characters and include a letter and a number.");
    if (next !== confirm) return setError("Passwords do not match.");
    setSaving(true);
    await changePassword(account.mobile, next);
    setAccount(null);
  };

  const logout = () => {
    clearSession();
    clearAccountSession();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Set a new password" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-500"><KeyRound size={20} /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Set a new password</h2>
            <p className="text-sm text-slate-500">Hi {account.name.split(" ")[0]}, you signed in with a temporary password. Choose your own to continue.</p>
          </div>
        </div>

        <PasswordInput label="New password" value={next} onChange={(e) => { setNext(e.target.value); setError(""); }} autoComplete="new-password" required autoFocus />
        <PasswordInput label="Confirm new password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} autoComplete="new-password" required />
        <p className="text-xs text-slate-400">At least 8 characters, with a letter and a number.</p>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <Button type="submit" loading={saving} className="w-full">Save password &amp; continue</Button>
        <button type="button" onClick={logout} className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700">Log out instead</button>
      </form>
    </div>
  );
}