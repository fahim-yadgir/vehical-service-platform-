"use client";
import type { Preset } from "../../lib/revenue";

const presets: { value: Preset; label: string }[] = [
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisFY", label: "This financial year" },
  { value: "lastFY", label: "Last financial year" },
  { value: "custom", label: "Custom range" },
];

type Props = {
  preset: Preset;
  onPreset: (p: Preset) => void;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  invalid: boolean;
};

export default function RevenueRangeFilter({ preset, onPreset, from, to, onFrom, onTo, invalid }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Date range">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={preset === p.value}
            onClick={() => onPreset(p.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${preset === p.value ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-600">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} className="input" style={{ width: "auto" }} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-600">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} className="input" style={{ width: "auto" }} />
          </label>
          {invalid && <p className="pb-2 text-xs font-semibold text-rose-600">Pick a valid range: "From" must be on or before "To".</p>}
        </div>
      )}
    </div>
  );
}