"use client";

import { useEffect, useState, type FormEvent } from "react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import LocationPicker, { type PickedLocation } from "../../../components/map/LocationPicker";
import { CheckCircle2 } from "lucide-react";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { emptyProfile, isProfileComplete, useOwnerProfile, type OwnerProfile } from "../../../lib/ownerProfile";
import { isEmail, isGst, isPincode } from "../../../lib/validators";

type Errors = Partial<Record<keyof OwnerProfile, string>>;

export default function OwnerProfilePage() {
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

  const location: PickedLocation | null = form.lat !== undefined && form.lng !== undefined ? { lat: form.lat, lng: form.lng, address: form.address } : null;
  const complete = isProfileComplete(profile);

  return (
    <>
      <Topbar title="Profile" subtitle="Your service centre details" />
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
      </div>
    </>
  );
}
