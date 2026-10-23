"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import PasswordInput from "../../../components/ui/PasswordInput";
import ForcePasswordChange from "../../../components/auth/ForcePasswordChange";
import LocationPicker, { type PickedLocation } from "../../../components/map/LocationPicker";
import { CheckCircle2, LogOut } from "lucide-react";
import { clearOwnerTenantId, useOwnerSubscription } from "../../../lib/ownerTenant";
import { clearSession } from "../../../lib/auth";
import { changePassword, getSessionAccount, verifyPassword } from "../../../lib/tenantAccounts";
import { emptyProfile, isProfileComplete, useOwnerProfile, type OwnerProfile } from "../../../lib/ownerProfile";
import { isEmail, isGst, isPincode } from "../../../lib/validators";

type Errors = Partial<Record<keyof OwnerProfile, string>>;

/** At least 8 characters, with a letter and a number. */
const strongEnough = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

/** Same as the admin profile: current password, new password, confirm. Works on the saved login of this owner. */
function ChangePasswordCard() {
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

export default function OwnerProfilePage() {
  const router = useRouter();
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const { profile, loaded, save } = useOwnerProfile(tenant?.id);

  const [form, setForm] = useState<OwnerProfile>(emptyProfile);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);

  // Fill the form once: saved details first, otherwise what the admin entered.
  useEffect(() => {
    if (!loaded || !tenant) return;
    setForm(profile ?? { ...emptyProfile, email: tenant.email ?? "" });
  }, [loaded, profile, tenant]);

  const set = (field: keyof OwnerProfile, value: string) => {
    const clean = field === "gstin" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) : field === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value;
    setForm({ ...form, [field]: clean });
    setErrors({ ...errors, [field]: undefined });
    setSaved(false);
  };

  const setLocation = (loc: PickedLocation) => {
    setForm((f) => ({ ...f, lat: loc.lat, lng: loc.lng, address: f.address.trim() ? f.address : loc.address === "Finding address..." ? "" : loc.address }));
    setSaved(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (form.gstin && !isGst(form.gstin)) next.gstin = "Enter a valid 15-character GST number, e.g. 27ABCDE1234F1Z5.";
    if (form.email.trim() && !isEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.address.trim()) next.address = "Enter the full address of your service centre.";
    if (!form.city.trim()) next.city = "Enter the city.";
    if (!form.state.trim()) next.state = "Enter the state.";
    if (!isPincode(form.pincode)) next.pincode = "Enter a valid 6-digit pincode.";
    setErrors(next);
    if (Object.keys(next).length) return;
    save({ ...form, email: form.email.trim(), address: form.address.trim(), city: form.city.trim(), state: form.state.trim() });
    setSaved(true);
  };

  const field = (key: keyof OwnerProfile, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={String(form[key] ?? "")} onChange={(e) => set(key, e.target.value)} className="input" aria-invalid={!!errors[key]} {...props} />
      {errors[key] && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors[key]}</span>}
    </label>
  );

  const readOnly = (label: string, value: string) => (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={value} readOnly className="input cursor-not-allowed bg-slate-50 text-slate-500" />
    </label>
  );

  const logout = () => {
    clearSession();
    clearOwnerTenantId();
    router.push("/login");
  };

  const location: PickedLocation | null = form.lat !== undefined && form.lng !== undefined ? { lat: form.lat, lng: form.lng, address: form.address } : null;
  const complete = isProfileComplete(profile);

  return (
    <>
      <Topbar title="Profile" subtitle="Your service centre details" />
      {/* Opens on its own after the first login with a temporary password. */}
      <ForcePasswordChange />
      <div className="container space-y-5">
        {loaded && !complete && (
          <div role="status" className="max-w-3xl rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
            Complete your centre profile (address and GST number) so customers can find and trust your service centre.
          </div>
        )}
        {saved && (
          <div role="status" className="flex max-w-3xl items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={18} /> Profile saved.
          </div>
        )}

        <form onSubmit={submit} noValidate className="card max-w-3xl space-y-6 p-6">
          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">Business details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {readOnly("Service centre name", tenant?.name ?? "")}
              {readOnly("Owner name", tenant?.owner ?? "")}
              {readOnly("Mobile number (login)", tenant?.mobile ?? "")}
              {field("email", "Email", { type: "email", placeholder: "owner@example.com" })}
              <div className="sm:col-span-2">
                {field("gstin", "GST number (GSTIN)", { placeholder: "27ABCDE1234F1Z5", autoCapitalize: "characters", className: "input font-mono uppercase" })}
                <p className="mt-1 text-xs text-slate-500">Optional. It appears on your invoices when added.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Full address</span>
                  <textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} className="input" aria-invalid={!!errors.address} placeholder="Shop / building, street, area" />
                  {errors.address && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.address}</span>}
                </label>
              </div>
              {field("city", "City", { placeholder: "Pune" })}
              {field("state", "State")}
              {field("pincode", "Pincode", { inputMode: "numeric", placeholder: "411014" })}
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Pin your location on the map (optional)</span>
              <LocationPicker value={location} onChange={setLocation} height={260} />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Save profile</Button>
          </div>
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