  "use client";

  import { X } from "lucide-react";

  export type Filters = { service: string; maxKm: number; sort: "nearest" | "rating" };

  export const defaultFilters: Filters = { service: "all", maxKm: 0, sort: "nearest" };

  export const countActive = (f: Filters) =>
    Number(f.service !== defaultFilters.service) + Number(f.maxKm !== defaultFilters.maxKm) + Number(f.sort !== defaultFilters.sort);

  const distances = [
    { value: 0, label: "Any distance" },
    { value: 3, label: "Within 3 km" },
    { value: 5, label: "Within 5 km" },
    { value: 10, label: "Within 10 km" },
  ];

  const sorts: { value: Filters["sort"]; label: string }[] = [
    { value: "nearest", label: "Nearest first" },
    { value: "rating", label: "Top rated" },
  ];

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
      active ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
    }`;

  /** `inline` = dropdowns in one row (desktop). `stack` = labelled chip groups (inside the mobile sheet). */
  export function FilterFields({
  filters,
  onChange,
  layout,
  serviceOptions,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  layout: "inline" | "stack";
  serviceOptions: string[];
}) { 
    const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

    if (layout === "inline") {
      return (
        <>
          <select value={filters.service} onChange={(e) => set({ service: e.target.value })} aria-label="Service" className="input" style={{ width: "auto" }}>
            <option value="all">All services</option>
            {serviceOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.maxKm} onChange={(e) => set({ maxKm: Number(e.target.value) })} aria-label="Distance" className="input" style={{ width: "auto" }}>
            {distances.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as Filters["sort"] })} aria-label="Sort by" className="input" style={{ width: "auto" }}>
            {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </>
      );
    }

    const group = (title: string, children: React.ReactNode) => (
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    );

    return (
      <div className="space-y-6">
        {group("Service",
          ["all", ...serviceOptions].map((s) => (
            <button key={s} type="button" aria-pressed={filters.service === s} onClick={() => set({ service: s })} className={chip(filters.service === s)}>
              {s === "all" ? "All services" : s}
            </button>
          )),
        )}
        {group("Distance",
          distances.map((d) => (
            <button key={d.value} type="button" aria-pressed={filters.maxKm === d.value} onClick={() => set({ maxKm: d.value })} className={chip(filters.maxKm === d.value)}>
              {d.label}
            </button>
          )),
        )}
        {group("Sort by",
          sorts.map((s) => (
            <button key={s.value} type="button" aria-pressed={filters.sort === s.value} onClick={() => set({ sort: s.value })} className={chip(filters.sort === s.value)}>
              {s.label}
            </button>
          )),
        )}
      </div>
    );
  }

  /** Removable chips showing which filters are on. */
  export function ActiveFilterChips({ filters, onChange, className = "" }: { filters: Filters; onChange: (next: Filters) => void; className?: string }) {
    const items = [
      filters.service !== defaultFilters.service && { label: filters.service, clear: { service: defaultFilters.service } },
      filters.maxKm !== defaultFilters.maxKm && { label: `Within ${filters.maxKm} km`, clear: { maxKm: defaultFilters.maxKm } },
      filters.sort !== defaultFilters.sort && { label: "Top rated", clear: { sort: defaultFilters.sort } },
    ].filter(Boolean) as { label: string; clear: Partial<Filters> }[];

    if (items.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {items.map((item) => (
          <button key={item.label} type="button" onClick={() => onChange({ ...filters, ...item.clear })} aria-label={`Remove filter ${item.label}`} className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
            {item.label} <X size={13} />
          </button>
        ))}
      </div>
    );
  }