import { Truck, Wrench } from "lucide-react";
import type { VehicleKind } from "../../lib/serviceCenterProfiles";

export type ChargeRow = { name: string; note?: string; price: string };

type Props = {
  services: ChargeRow[];
  facilities: ChargeRow[];
  /** Stack the two lists (for narrow spaces such as the owner's preview). */
  stacked?: boolean;
  /** Shown instead of a list that has no rows. */
  servicesEmpty?: string;
  facilitiesEmpty?: string;
  /** With both set, a Car / Bike switch is shown above the lists. */
  kind?: VehicleKind;
  onKindChange?: (kind: VehicleKind) => void;
};

function List({ rows, empty }: { rows: ChargeRow[]; empty?: string }) {
  if (rows.length === 0 && empty) return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 text-sm">
      {rows.map((r, i) => (
        <li key={`${r.name}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3">
          <span>{r.name}{r.note && <span className="block text-xs text-slate-400">{r.note}</span>}</span>
          <span className={`shrink-0 font-black ${r.price === "Not available" ? "text-slate-400" : ""}`}>{r.price}</span>
        </li>
      ))}
    </ul>
  );
}

/** The service and facility rates exactly as a customer sees them. Used on the customer's service centre page and in the owner's My Rates preview. */
export default function CenterCharges({ services, facilities, stacked = false, servicesEmpty, facilitiesEmpty, kind, onKindChange }: Props) {
  return (
    <>
      {kind && onKindChange && (
        <div className="mb-5 inline-flex rounded-xl border bg-white p-1" role="group" aria-label="Vehicle type">
          {(["Car", "Bike"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => onKindChange(k)} className={`rounded-lg px-4 py-2 text-sm font-bold ${kind === k ? "bg-slate-950 text-white" : "text-slate-600"}`}>
              {k === "Car" ? "🚗 Car" : "🏍️ Bike"}
            </button>
          ))}
        </div>
      )}
      <div className={`grid gap-6 ${stacked ? "" : "lg:grid-cols-2"}`}>
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-black"><Wrench size={17} className="text-orange-500" /> Services</h3>
          <List rows={services} empty={servicesEmpty} />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-black"><Truck size={17} className="text-orange-500" /> Facilities &amp; extras</h3>
          <List rows={facilities} empty={facilitiesEmpty} />
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Prices are indicative and include GST. The final estimate is shared after inspection and needs your approval before any work starts.
      </p>
    </>
  );
}