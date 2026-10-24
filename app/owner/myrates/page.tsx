"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Badge from "../../../components/ui/Badge";
import RateForm from "../../../components/owner/RateForm";
import CenterCharges, { type ChargeRow } from "../../../components/customer/CenterCharges";
import { useOwnerSubscription } from "../../../lib/ownerTenant";
import { serviceCenters, serviceOptions } from "../../../lib/serviceCenters";
import type { VehicleKind } from "../../../lib/serviceCenterProfiles";
import { centerIdForTenant, emptyRates, facilitySuggestions, rateAppliesTo, rateLabel, useOwnerRates, vehicleLabel, type RateItem, type RateVehicle } from "../../../lib/ownerRates";

type Group = "services" | "facilities";
type Editing = { group: Group; rate: RateItem | null; presetName?: string };

const copy: Record<Group, { title: string; hint: string; empty: string; add: string; suggestions: string[] }> = {
  services: {
    title: "Service rates",
    hint: "Fixed price for each service, per vehicle type. Customers see these on your service centre page.",
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

const vehicleTone: Record<RateVehicle, "blue" | "yellow" | "gray"> = { Car: "blue", Bike: "yellow", Both: "gray" };

export default function MyRates() {
  const sub = useOwnerSubscription();
  const tenant = sub?.tenant;
  const { rates, loaded, save } = useOwnerRates(tenant?.id);
  const data = rates ?? emptyRates;

  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<VehicleKind>("Car");

  /** Every change is saved straight away, so what customers see is always what is listed here. */
  function saveRate(group: Group, rate: RateItem) {
    const list = data[group];
    const exists = list.some((r) => r.id === rate.id);
    save({ ...data, [group]: exists ? list.map((r) => (r.id === rate.id ? rate : r)) : [...list, rate] });
    setEditing(null);
    setNotice(`${rate.name} (${vehicleLabel[rate.vehicle]}) ${exists ? "updated" : "added"}.`);
  }

  function removeRate(group: Group, rate: RateItem) {
    if (!window.confirm(`Delete "${rate.name}" for ${vehicleLabel[rate.vehicle]}? Customers will no longer see this rate.`)) return;
    save({ ...data, [group]: data[group].filter((r) => r.id !== rate.id) });
    setNotice(`${rate.name} (${vehicleLabel[rate.vehicle]}) deleted.`);
  }

  const centerId = tenant ? centerIdForTenant(tenant.id) : "";
  const onCustomerList = serviceCenters.some((c) => c.id === centerId);

  /** Rows exactly as the customer page lists them for the chosen vehicle type. */
  const preview = (group: Group): ChargeRow[] =>
    data[group].filter((r) => rateAppliesTo(r, previewKind)).map((r) => ({ name: r.name, note: r.note, price: rateLabel(r.price) }));

  const section = (group: Group) => {
    const c = copy[group];
    const list = data[group];
    const used = new Set(list.map((r) => r.name.toLowerCase()));
    const suggestions = c.suggestions.filter((s) => !used.has(s.toLowerCase()));
    return (
      <section className="card max-w-3xl space-y-4 p-6" aria-labelledby={`${group}-heading`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`${group}-heading`} className="text-lg font-black text-slate-900">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{c.hint}</p>
          </div>
          <button type="button" onClick={() => setEditing({ group, rate: null })} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-orange-600">
            <Plus size={16} /> {c.add}
          </button>
        </div>

        {loaded && list.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{c.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">{r.name} <Badge tone={vehicleTone[r.vehicle]}>{vehicleLabel[r.vehicle]}</Badge></p>
                  {r.note && <p className="mt-0.5 text-xs text-slate-500">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <b className="mr-2 text-slate-900">{rateLabel(r.price)}</b>
                  <button type="button" onClick={() => setEditing({ group, rate: r })} aria-label={`Edit ${r.name}, ${vehicleLabel[r.vehicle]}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Pencil size={14} /> Edit</button>
                  <button type="button" onClick={() => removeRate(group, r)} aria-label={`Delete ${r.name}, ${vehicleLabel[r.vehicle]}`} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">quick add:</span>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setEditing({ group, rate: null, presetName: s })} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">+ {s}</button>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <Topbar title="My Rates" subtitle="Fix the rates customers see for your services and facilities" />
      <div className="container space-y-5">
        {notice && (
          <div role="status" className="flex max-w-3xl flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <span className="flex flex-wrap items-center gap-2">
              <CheckCircle2 size={18} /> {notice}
              {onCustomerList && <Link href={`/customer/serviceCenters/${centerId}`} className="underline">See how customers view it</Link>}
            </span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="font-black opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-5">
            {section("services")}
            {section("facilities")}
            <p className="max-w-3xl text-xs text-slate-500">Prices include GST. If you add no rates, customers see the standard starting prices.</p>
          </div>

          <aside className="card p-6 xl:sticky xl:top-6" aria-labelledby="preview-heading">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="preview-heading" className="text-lg font-black text-slate-900">Customer preview</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Live</span>
            </div>
            <p className="mb-4 text-sm text-slate-500">This is how customers see your rates on your service centre page.</p>
            <h3 className="mb-4 text-xl font-black tracking-tight">Charges</h3>
            <CenterCharges
              stacked
              kind={previewKind}
              onKindChange={setPreviewKind}
              services={preview("services")}
              facilities={preview("facilities")}
              servicesEmpty={data.services.length ? `No ${previewKind === "Car" ? "car" : "bike"} service rates yet.` : "No service rates yet. Customers see standard starting prices."}
              facilitiesEmpty={data.facilities.length ? `No ${previewKind === "Car" ? "car" : "bike"} facility rates yet.` : "No facility rates yet. Customers see standard starting prices."}
            />
          </aside>
        </div>
      </div>

      {editing && (
        <RateForm
          title={copy[editing.group].title}
          initial={editing.rate}
          presetName={editing.presetName}
          suggestions={copy[editing.group].suggestions}
          existing={data[editing.group]}
          onSave={(rate) => saveRate(editing.group, rate)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}