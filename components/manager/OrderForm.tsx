"use client";

import { useState, type ReactNode } from "react";
import type { StaffMember } from "../../lib/redux-store";
import type { RateItem } from "../../lib/ownerRates";

export type OrderFormData = {
  customer: { name: string; mobile: string };
  vehicle: { type: string; brand: string; model: string; registrationNo: string; year?: number };
  service: string;
  date: string;
  amount: number;
  notes?: string;
  assignedStaffId?: string;
};

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="muted mb-1 block text-xs">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export default function OrderForm({
  services,
  staff,
  onSubmit,
}: {
  services: RateItem[];
  staff: StaffMember[];
  onSubmit: (data: OrderFormData) => void;
}) {
  const [f, setF] = useState({
    name: "", mobile: "", type: "Car", brand: "", model: "", registration: "", year: "",
    serviceId: "", customService: "", amount: "", date: today(), notes: "", staffId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof f, value: string) => setF((p) => ({ ...p, [key]: value }));

  const pickService = (value: string) => {
    const rate = services.find((s) => s.id === value);
    setF((p) => ({ ...p, serviceId: value, amount: rate ? String(rate.price) : p.amount }));
  };

  const submit = () => {
    const registration = f.registration.replace(/\s/g, "").toUpperCase();
    const service =
      f.serviceId === "other" || services.length === 0
        ? f.customService.trim()
        : (services.find((s) => s.id === f.serviceId)?.name ?? "");
    const amount = Number(f.amount);
    const year = f.year ? Number(f.year) : undefined;

    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Enter the customer's name";
    if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = "Enter a 10-digit mobile number";
    if (!f.brand.trim()) e.brand = "Enter the brand";
    if (!f.model.trim()) e.model = "Enter the model";
    if (!/^[A-Z0-9-]{4,15}$/.test(registration)) e.registration = "Enter a valid registration number";
    if (year !== undefined && (year < 1980 || year > new Date().getFullYear() + 1)) e.year = "Enter a valid year";
    if (!service) e.service = "Choose or enter a service";
    if (f.amount === "" || Number.isNaN(amount) || amount < 0) e.amount = "Enter the amount";
    if (!f.date) e.date = "Choose a date";
    setErrors(e);
    if (Object.keys(e).length) return;

    onSubmit({
      customer: { name: f.name.trim(), mobile: f.mobile },
      vehicle: { type: f.type, brand: f.brand.trim(), model: f.model.trim(), registrationNo: registration, year },
      service,
      date: new Date(f.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      amount,
      notes: f.notes.trim() || undefined,
      assignedStaffId: f.staffId || undefined,
    });
  };

  return (
    <div className="card space-y-6 p-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <b className="sm:col-span-2">Customer</b>
        <Field label="Name" error={errors.name}>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Mobile number" error={errors.mobile}>
          <input className="input" inputMode="numeric" maxLength={10} value={f.mobile}
            onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))} />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <b className="sm:col-span-2">Vehicle</b>
        <Field label="Type">
          <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option>Car</option>
            <option>Bike</option>
            <option>Scooter</option>
          </select>
        </Field>
        <Field label="Registration number" error={errors.registration}>
          <input className="input uppercase" value={f.registration}
            onChange={(e) => set("registration", e.target.value)} />
        </Field>
        <Field label="Brand" error={errors.brand}>
          <input className="input" value={f.brand} onChange={(e) => set("brand", e.target.value)} />
        </Field>
        <Field label="Model" error={errors.model}>
          <input className="input" value={f.model} onChange={(e) => set("model", e.target.value)} />
        </Field>
        <Field label="Year (optional)" error={errors.year}>
          <input className="input" inputMode="numeric" maxLength={4} value={f.year}
            onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))} />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <b className="sm:col-span-2">Service</b>
        {services.length > 0 && (
          <Field label="Service" error={errors.service}>
            <select className="input" value={f.serviceId} onChange={(e) => pickService(e.target.value)}>
              <option value="">Choose a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="other">Other…</option>
            </select>
          </Field>
        )}
        {(services.length === 0 || f.serviceId === "other") && (
          <Field label="Service name" error={errors.service}>
            <input className="input" value={f.customService}
              onChange={(e) => set("customService", e.target.value)} />
          </Field>
        )}
        <Field label="Amount (₹)" error={errors.amount}>
          <input className="input" inputMode="numeric" value={f.amount}
            onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Date" error={errors.date}>
          <input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Assign staff (optional)">
          <select className="input" value={f.staffId} onChange={(e) => set("staffId", e.target.value)}>
            <option value="">Assign later</option>
            {staff.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes (optional)">
            <textarea className="input" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </section>

      <button type="button" onClick={submit}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
        Create order
      </button>
    </div>
  );
}