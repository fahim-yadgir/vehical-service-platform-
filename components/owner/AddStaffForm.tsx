"use client";
import { useState, type FormEvent } from "react";
import Button from "../ui/Button";
import { isEmail, isMobile } from "../../lib/validators";

export type NewStaff = { name: string; mobile: string; email: string; role: "Manager" | "Driver" };

type Props = { existingMobiles: string[]; onCreate: (data: NewStaff) => void; onCancel: () => void };

export default function AddStaffForm({ existingMobiles, onCreate, onCancel }: Props) {
  const [form, setForm] = useState<NewStaff>({ name: "", mobile: "", email: "", role: "Manager" });
  const [errors, setErrors] = useState<Partial<Record<keyof NewStaff, string>>>({});

  const set = (field: keyof NewStaff, value: string) => {
    setForm({ ...form, [field]: field === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value });
    setErrors({ ...errors, [field]: undefined });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Enter the person's name.";
    if (!isMobile(form.mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    else if (existingMobiles.includes(form.mobile)) next.mobile = "This mobile number is already registered.";
    if (form.email.trim() && !isEmail(form.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length === 0) onCreate({ ...form, name: form.name.trim(), email: form.email.trim() });
  };

  const field = (key: "name" | "mobile" | "email", label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={form[key]} onChange={(e) => set(key, e.target.value)} className="input" aria-invalid={!!errors[key]} {...props} />
      {errors[key] && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors[key]}</span>}
    </label>
  );

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="add-staff-heading">
      <div className="mb-4">
        <h2 id="add-staff-heading" className="text-lg font-bold text-slate-900">Add manager or staff</h2>
        <p className="mt-1 text-sm text-slate-500">A temporary password is created for them. Send it on WhatsApp; they change it on first login.</p>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {field("name", "Full name", { placeholder: "e.g. Riya Sharma" })}
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Role</span>
          <select value={form.role} onChange={(e) => set("role", e.target.value)} className="input">
            <option value="Manager">Manager (workshop operations)</option>
            <option value="Driver">Staff / Driver (pickup &amp; drop)</option>
          </select>
        </label>
        {field("mobile", "Mobile number", { type: "tel", inputMode: "numeric", placeholder: "10-digit mobile" })}
        {field("email", "Email (optional)", { type: "email", placeholder: "name@example.com" })}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button type="submit">Add &amp; get login details</Button>
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
        </div>
      </form>
    </section>
  );
}
