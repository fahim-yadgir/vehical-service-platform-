"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { serviceCenters, serviceOptions } from "../../../lib/serviceCenters";
import { centerIdForTenant, facilitySuggestions, useOwnerRates, type OwnerRates, type RateItem } from "../../../lib/ownerRates";

type Group = "services" | "facilities";
/** A row while editing: the price stays text so the owner can type freely. */
type Row = { id: string; name: string; price: string; note: string };
type RowErrors = Record<string, { name?: string; price?: string }>;

const newId = () => Math.random().toString(36).slice(2, 10);
const toRow = (r: RateItem): Row => ({ id: r.id, name: r.name, price: String(r.price), note: r.note ?? "" });

const copy: Record<Group, { title: string; hint: string; empty: string; add: string; suggestions: string[] }> = {
  services: {
    title: "Service rates",
    hint: "Fixed price for each service you offer. Customers see these on your service centre page.",
    empty: "No service rates yet. Add your first one or pick from the suggestions.",
    add: "Add service rate",
    suggestions: serviceOptions,
  },
  facilities: {
    title: "Facility & extra rates",
    hint: "Charges for pickup & drop, inspection, towing and other extras. Enter 0 for free.",
    empty: "No facility rates yet. Add your first one or pick from the suggestions.",
    add: "Add facility rate",
    suggestions: facilitySuggestions,
  },
};

export default function MyRates() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const { rates, loaded, save } = useOwnerRates(tenant?.id);

  const [rows, setRows] = useState<Record<Group, Row[]>>({ services: [], facilities: [] });
  const [errors, setErrors] = useState<RowErrors>({});
  const [saved, setSaved] = useState(false);

  // Fill the form once the saved rates have been read.
  useEffect(() => {
    if (!loaded) return;
    setRows({ services: (rates?.services ?? []).map(toRow), facilities: (rates?.facilities ?? []).map(toRow) });
  }, [loaded, rates]);

  const touch = () => setSaved(false);

  const update = (group: Group, id: string, field: "name" | "price" | "note", value: string) => {
    const clean = field === "price" ? value.replace(/\D/g, "").slice(0, 7) : value;
    setRows((r) => ({ ...r, [group]: r[group].map((row) => (row.id === id ? { ...row, [field]: clean } : row)) }));
    setErrors((e) => ({ ...e, [id]: { ...e[id], [field]: undefined } }));
    touch();
  };

  const add = (group: Group, name = "") => {
    setRows((r) => ({ ...r, [group]: [...r[group], { id: newId(), name, price: "", note: "" }] }));
    touch();
  };

  const remove = (group: Group, id: string) => {
    setRows((r) => ({ ...r, [group]: r[group].filter((row) => row.id !== id) }));
    touch();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: RowErrors = {};
    (["services", "facilities"] as Group[]).forEach((group) => {
      const seen = new Set<string>();
      rows[group].forEach((row) => {
        const name = row.name.trim();
        const problems: { name?: string; price?: string } = {};
        if (!name) problems.name = "Enter a name.";
        else if (name.length > 60) problems.name = "Use 60 characters or fewer.";
        else if (seen.has(name.toLowerCase())) problems.name = "This name is already added.";
        if (row.price === "") problems.price = "Enter a price (0 for free).";
        seen.add(name.toLowerCase());
        if (problems.name || problems.price) next[row.id] = problems;
      });
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    const clean = (list: Row[]): RateItem[] => list.map((row) => ({ id: row.id, name: row.name.trim(), price: Number(row.price), note: row.note.trim() || undefined }));
    const result: OwnerRates = { services: clean(rows.services), facilities: clean(rows.facilities) };
    save(result);
    setSaved(true);
  };

  const centerId = tenant ? centerIdForTenant(tenant.id) : "";
  const onCustomerList = serviceCenters.some((c) => c.id === centerId);

  const section = (group: Group) => {
    const c = copy[group];
    const list = rows[group];
    const used = new Set(list.map((r) => r.name.trim().toLowerCase()));
    const suggestions = c.suggestions.filter((s) => !used.has(s.toLowerCase()));
    return (
      <section className="card max-w-3xl space-y-4 p-6" aria-labelledby={`${group}-heading`}>
        <div>
          <h2 id={`${group}-heading`} className="text-lg font-black text-slate-900">{c.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{c.hint}</p>
        </div>

        {list.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{c.empty}</p>}

        <div className="space-y-3">
          {list.map((row) => (
            <div key={row.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_130px_auto]">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">Name</span>
                <input value={row.name} onChange={(e) => update(group, row.id, "name", e.target.value)} className="input" aria-invalid={!!errors[row.id]?.name} placeholder="e.g. Oil Change" />
                {errors[row.id]?.name && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors[row.id]?.name}</span>}
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">Price (₹)</span>
                <input value={row.price} onChange={(e) => update(group, row.id, "price", e.target.value)} className="input" inputMode="numeric" aria-invalid={!!errors[row.id]?.price} placeholder="799" />
                {errors[row.id]?.price && <span role="alert" className="block text-xs font-semibold text-rose-600">{errors[row.id]?.price}</span>}
              </label>
              <button type="button" onClick={() => remove(group, row.id)} aria-label={`Remove ${row.name || "rate"}`} className="self-end rounded-lg border border-red-200 p-2.5 text-red-700 hover:bg-red-50">
                <Trash2 size={16} />
              </button>
              <label className="block space-y-1 sm:col-span-3">
                <span className="text-xs font-bold text-slate-600">Note (optional)</span>
                <input value={row.note} onChange={(e) => update(group, row.id, "note", e.target.value)} className="input" placeholder="e.g. Includes filter and 3.5 L engine oil" />
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => add(group)} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50">
            <Plus size={16} /> {c.add}
          </button>
          {suggestions.length > 0 && <span className="text-xs text-slate-400">or quick add:</span>}
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => add(group, s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              + {s}
            </button>
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      <Topbar title="My Rates" subtitle="Fix the rates customers see for your services and facilities" />
      <div className="container space-y-5">
        {saved && (
          <div role="status" className="flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={18} /> Rates saved.
            {onCustomerList && (
              <Link href={`/customer/serviceCenters/${centerId}`} className="underline">See how customers view it</Link>
            )}
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-5">
          {section("services")}
          {section("facilities")}
          <div className="flex max-w-3xl flex-wrap items-center gap-3">
            <Button type="submit">Save rates</Button>
            <p className="text-xs text-slate-500">Prices include GST. If nothing is saved, customers see the standard starting prices.</p>
          </div>
        </form>
      </div>
    </>
  );
}