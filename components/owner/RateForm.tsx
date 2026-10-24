"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { vehicleLabel, vehiclesOverlap, type RateItem, type RateVehicle } from "../../lib/ownerRates";

type Props = {
  /** What kind of rate this is, for the heading. */
  title: string;
  /** The rate being edited, or null when adding a new one. */
  initial: RateItem | null;
  /** Name to start with when adding from a suggestion. */
  presetName?: string;
  suggestions: string[];
  /** Other rates in the same list, to stop two rates covering the same work and vehicle. */
  existing: RateItem[];
  onSave: (rate: RateItem) => void;
  onClose: () => void;
};

const VEHICLES: RateVehicle[] = ["Car", "Bike", "Both"];

/** A modal to add one rate or edit a saved one: name, vehicle type, price and note. */
export default function RateForm({ title, initial, presetName = "", suggestions, existing, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? presetName);
  const [vehicle, setVehicle] = useState<RateVehicle>(initial?.vehicle ?? "Car");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const next: typeof errors = {};
    if (!trimmed) next.name = "Enter a name.";
    else if (trimmed.length > 60) next.name = "Use 60 characters or fewer.";
    else if (existing.some((r) => r.id !== initial?.id && r.name.toLowerCase() === trimmed.toLowerCase() && vehiclesOverlap(r.vehicle, vehicle))) {
      next.name = "You already have this rate for that vehicle type. Edit it instead.";
    }
    if (price === "") next.price = "Enter a price (0 for free).";
    setErrors(next);
    if (next.name || next.price) return;
    onSave({ id: initial?.id ?? Math.random().toString(36).slice(2, 10), name: trimmed, vehicle, price: Number(price), note: note.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="rate-form-title" className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="rate-form-title" className="text-xl font-black text-slate-900">{initial ? "Edit rate" : "Add rate"}</h2>
            <p className="mt-1 text-sm text-slate-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Name</span>
            <input value={name} list="rate-names" autoFocus onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: undefined }); }} className="input" aria-invalid={!!errors.name} placeholder="e.g. Oil Change" />
            <datalist id="rate-names">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
            {errors.name && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.name}</span>}
          </label>

          <div className="space-y-2">
            <span id="vehicle-label" className="text-sm font-bold text-slate-700">Vehicle type</span>
            <div role="radiogroup" aria-labelledby="vehicle-label" className="grid gap-2 sm:grid-cols-3">
              {VEHICLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={vehicle === v}
                  onClick={() => { setVehicle(v); setErrors({ ...errors, name: undefined }); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${vehicle === v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {v === "Car" ? "🚗 " : v === "Bike" ? "🏍️ " : ""}{vehicleLabel[v]}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Price (₹)</span>
            <input value={price} onChange={(e) => { setPrice(e.target.value.replace(/\D/g, "").slice(0, 7)); setErrors({ ...errors, price: undefined }); }} className="input" inputMode="numeric" aria-invalid={!!errors.price} placeholder="799" />
            {errors.price && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors.price}</span>}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. Includes filter and 3.5 L engine oil" />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">{initial ? "Save changes" : "Add rate"}</Button>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}