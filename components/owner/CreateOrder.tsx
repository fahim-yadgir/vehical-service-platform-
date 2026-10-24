"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Button from "../ui/Button";
import { isMobile } from "../../lib/validators";
import { ymd } from "../../lib/revenue";
import { inr, type NewOrder } from "../../lib/orders";
import type { StaffMember } from "../../lib/redux-store";

type Props = {
  /** The owner's fixed rates (My Rates). Picking one fills its price. */
  rates: { name: string; price: number }[];
  /** Extra service names to suggest when there are no rates yet. */
  suggestions: string[];
  /** Staff that can be appointed right away (active ones only). */
  staff: StaffMember[];
  onCreate: (data: NewOrder) => void;
  onClose: () => void;
};

type Row = { id: string; name: string; price: string };
type Errors = { customer?: string; mobile?: string; vehicle?: string; date?: string; items?: string; rows: Record<string, { name?: string; price?: string }> };

const newRow = (name = "", price = ""): Row => ({ id: Math.random().toString(36).slice(2, 10), name, price });

/** A modal where the owner records an order: customer, vehicle, the work to do, the price and (optionally) the staff. */
export default function CreateOrder({ rates, suggestions, staff, onCreate, onClose }: Props) {
  const [form, setForm] = useState({ customer: "", mobile: "", vehicle: "", date: ymd(new Date()), notes: "", staffId: "" });
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [errors, setErrors] = useState<Errors>({ rows: {} });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rateOf = (name: string) => rates.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());
  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const datalist = [...new Set([...rates.map((r) => r.name), ...suggestions])];
  const quick = (rates.length ? rates.map((r) => r.name) : suggestions.slice(0, 6)).filter((n) => !rows.some((r) => r.name.trim().toLowerCase() === n.toLowerCase()));

  const set = (field: keyof typeof form, value: string) => {
    setForm({ ...form, [field]: field === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value });
    setErrors({ ...errors, [field]: undefined });
  };

  const setRow = (id: string, field: "name" | "price", value: string) => {
    setRows((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        if (field === "price") return { ...r, price: value.replace(/\D/g, "").slice(0, 7) };
        // Choosing a fixed rate fills the price while it is still empty.
        const rate = rateOf(value);
        return { ...r, name: value, price: r.price === "" && rate ? String(rate.price) : r.price };
      }),
    );
    setErrors((e) => ({ ...e, items: undefined, rows: { ...e.rows, [id]: { ...e.rows[id], [field]: undefined } } }));
  };

  const addQuick = (name: string) => {
    const rate = rateOf(name);
    // Replace the empty first row instead of leaving it blank.
    setRows((list) => (list.length === 1 && !list[0].name && !list[0].price ? [newRow(name, rate ? String(rate.price) : "")] : [...list, newRow(name, rate ? String(rate.price) : "")]));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = { rows: {} };
    if (!form.customer.trim()) next.customer = "Enter the customer's name.";
    if (!isMobile(form.mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    if (!form.vehicle.trim()) next.vehicle = "Enter the vehicle, e.g. Honda City MH12AB1234.";
    if (!form.date) next.date = "Pick the order date.";
    rows.forEach((r) => {
      const p: { name?: string; price?: string } = {};
      if (!r.name.trim()) p.name = "Enter the work.";
      if (r.price === "") p.price = "Enter the price.";
      if (p.name || p.price) next.rows[r.id] = p;
    });
    if (rows.length === 0) next.items = "Add at least one work item.";
    setErrors(next);
    if (next.customer || next.mobile || next.vehicle || next.date || next.items || Object.keys(next.rows).length) return;

    onCreate({
      customer: form.customer.trim(),
      mobile: form.mobile,
      vehicle: form.vehicle.trim(),
      date: form.date,
      notes: form.notes.trim() || undefined,
      assignedTo: form.staffId || undefined,
      items: rows.map((r) => ({ id: r.id, name: r.name.trim(), price: Number(r.price) })),
    });
  };

  const field = (key: "customer" | "mobile" | "vehicle" | "date", label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={form[key]} onChange={(e) => set(key, e.target.value)} className="input" aria-invalid={!!errors[key]} {...props} />
      {errors[key] && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-order-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="create-order-title" className="text-xl font-black text-slate-900">Create order</h2>
            <p className="mt-1 text-sm text-slate-500">For a customer who calls or walks in. Add the work, set the price and appoint staff.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("customer", "Customer name", { placeholder: "e.g. Ananya Deshmukh", autoFocus: true })}
            {field("mobile", "Customer mobile", { type: "tel", inputMode: "numeric", placeholder: "10-digit mobile" })}
            {field("vehicle", "Vehicle", { placeholder: "Honda City MH12AB1234" })}
            {field("date", "Order date", { type: "date" })}
          </div>

          <section aria-labelledby="work-heading" className="space-y-3">
            <h3 id="work-heading" className="text-sm font-black text-slate-900">Work to do</h3>
            <datalist id="order-work-names">{datalist.map((n) => <option key={n} value={n} />)}</datalist>
            {rows.map((r) => (
              <div key={r.id} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                <label className="block space-y-1">
                  <span className="sr-only">Work</span>
                  <input value={r.name} list="order-work-names" onChange={(e) => setRow(r.id, "name", e.target.value)} className="input" placeholder="e.g. Oil Change" aria-label="Work" aria-invalid={!!errors.rows[r.id]?.name} />
                  {errors.rows[r.id]?.name && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.rows[r.id]?.name}</span>}
                </label>
                <label className="block space-y-1">
                  <span className="sr-only">Price in rupees</span>
                  <input value={r.price} onChange={(e) => setRow(r.id, "price", e.target.value)} className="input" inputMode="numeric" placeholder="Price ₹" aria-label="Price in rupees" aria-invalid={!!errors.rows[r.id]?.price} />
                  {errors.rows[r.id]?.price && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.rows[r.id]?.price}</span>}
                </label>
                <button type="button" onClick={() => setRows((l) => l.filter((x) => x.id !== r.id))} aria-label={`Remove ${r.name || "work item"}`} className="self-start rounded-lg border border-red-200 p-2.5 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            ))}
            {errors.items && <p role="alert" className="text-xs font-semibold text-rose-600">{errors.items}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setRows((l) => [...l, newRow()])} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50"><Plus size={16} /> Add work</button>
              {quick.length > 0 && <span className="text-xs text-slate-400">{rates.length ? "from My Rates:" : "quick add:"}</span>}
              {quick.map((n) => (
                <button key={n} type="button" onClick={() => addQuick(n)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">+ {n}</button>
              ))}
            </div>
            <p className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Total <span className="text-lg font-black text-slate-900">{inr(total)}</span></p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Appoint staff (optional)</span>
              <select value={form.staffId} onChange={(e) => set("staffId", e.target.value)} className="input">
                <option value="">Decide later</option>
                {staff.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role === "Driver" ? "Staff/Driver" : "Manager"}</option>)}
              </select>
              {staff.length === 0 && <span className="block text-xs text-slate-500">No active staff yet. Add them in My Staff.</span>}
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Notes (optional)</span>
              <input value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input" placeholder="e.g. Customer will wait at the lounge" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Create order</Button>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}