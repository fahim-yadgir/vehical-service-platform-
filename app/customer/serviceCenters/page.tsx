"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, List, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
import Topbar from "../../../components/navbar/Topbar";
import Button from "../../../components/ui/Button";
import BottomSheet from "../../../components/ui/BottomSheet";
import LocationPicker, { type PickedLocation } from "../../../components/map/LocationPicker";
import ServiceCenterCard, { type CenterWithDistance } from "../../../components/customer/ServiceCenterCard";
import { ActiveFilterChips, FilterFields, countActive, defaultFilters, type Filters } from "../../../components/customer/ServiceCenterFilters";
import { categories, serviceCenters, type CenterCategory } from "../../../lib/serviceCenters";
import { distanceKm, formatKm } from "../../../lib/geo";
import { DEFAULT_LOCATION, loadLocation, saveLocation } from "../../../lib/customerLocation";

const ServiceCentersMap = dynamic(() => import("../../../components/map/ServiceCentersMap"), {
  ssr: false,
  loading: () => <div className="grid h-[520px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">Loading map...</div>,
});

type CategoryFilter = "all" | CenterCategory;

const chip = (active: boolean) =>
  `shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
    active ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
  }`;

export default function ServiceCentersPage() {
  const [location, setLocation] = useState<PickedLocation>(DEFAULT_LOCATION);
  const [changing, setChanging] = useState(false);
  const [draft, setDraft] = useState<PickedLocation | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [fourPlus, setFourPlus] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Remember the last chosen location on this device.
  useEffect(() => {
    const saved = loadLocation();
    if (saved) setLocation(saved);
  }, []);

  const confirmLocation = () => {
    if (!draft || draft.address === "Finding address...") return;
    setLocation(draft);
    saveLocation(draft);
    setChanging(false);
  };

  const results: CenterWithDistance[] = useMemo(() => {
    const text = query.trim().toLowerCase();
    return serviceCenters
      .map((c) => ({ ...c, distance: distanceKm(location, c.location) }))
      .filter((c) => category === "all" || c.category === category)
      .filter((c) => filters.service === "all" || c.services.includes(filters.service))
      .filter((c) => !filters.maxKm || c.distance <= filters.maxKm)
      .filter((c) => !fourPlus || c.rating >= 4)
      .filter(
        (c) =>
          !text ||
          c.name.toLowerCase().includes(text) ||
          c.area.toLowerCase().includes(text) ||
          c.address.toLowerCase().includes(text) ||
          c.brands.some((b) => b.toLowerCase().includes(text)),
      )
      .sort((a, b) => (filters.sort === "rating" ? b.rating - a.rating : a.distance - b.distance));
  }, [location, query, category, fourPlus, filters]);

  const selected = results.find((c) => c.id === selectedId) ?? null;
  const activeCount = countActive(filters);

  return (
    <>
      <Topbar title="Service Centers" subtitle="Find service centers near your address" />

      <div className="container space-y-5">
        {/* Current location */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <MapPin size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Showing centers near</p>
                <p className="truncate font-bold text-slate-900">{location.address}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft(location);
                setChanging(!changing);
              }}
              aria-expanded={changing}
              className="btn btn-secondary text-sm"
            >
              Change location <ChevronDown size={16} className={changing ? "rotate-180" : ""} />
            </button>
          </div>

          {changing && (
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              <LocationPicker value={draft} onChange={setDraft} height={260} />
              <div className="flex gap-2">
                <Button type="button" onClick={confirmLocation} disabled={!draft || draft.address === "Finding address..."}>
                  Use this location
                </Button>
                <button type="button" className="btn btn-secondary" onClick={() => setChanging(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search + filters */}
        <div className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-slate-500">
              <Search size={16} className="shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, area or brand"
                aria-label="Search service centers"
                className="w-full min-w-0 bg-transparent text-sm outline-none"
              />
            </label>

            {/* Desktop: dropdowns in the same row */}
            <div className="hidden items-center gap-3 md:flex">
              <FilterFields filters={filters} onChange={setFilters} layout="inline" />
            </div>

            {/* Mobile: one button that opens the filter sheet */}
            <div className="shrink-0 md:hidden">
              <button type="button" onClick={() => setSheetOpen(true)} className="btn btn-secondary text-sm">
                <SlidersHorizontal size={16} /> Filters
                {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-orange-500 text-[11px] text-white">{activeCount}</span>}
              </button>
            </div>
          </div>

          {/* Categories: one scrollable line on mobile, wraps on desktop */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
            <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className={chip(category === "all")}>All categories</button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>{c}</button>
            ))}
            <button type="button" aria-pressed={fourPlus} onClick={() => setFourPlus(!fourPlus)} className={chip(fourPlus)}>★ 4.0 &amp; above</button>
          </div>

          <ActiveFilterChips filters={filters} onChange={setFilters} className="md:hidden" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600">
            {results.length} service center{results.length === 1 ? "" : "s"} found
          </p>
          <div className="inline-flex rounded-xl border bg-white p-1" role="group" aria-label="View">
            {(["list", "map"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${view === v ? "bg-slate-950 text-white" : "text-slate-600"}`}>
                {v === "list" ? <List size={16} /> : <MapIcon size={16} />} {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>

        {results.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500">
            No service centers match your search. Try removing a filter or changing the location.
          </div>
        ) : view === "list" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((c) => (
              <ServiceCenterCard key={c.id} center={c} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <ServiceCentersMap centers={results} user={location} selectedId={selectedId} onSelect={setSelectedId} height={560} />
            <div className="space-y-4">
              {selected ? (
                <ServiceCenterCard center={selected} selected />
              ) : (
                <div className="card p-6 text-sm text-slate-500">Tap a pin on the map to see the service center.</div>
              )}
              <div className="hidden max-h-[360px] space-y-3 overflow-y-auto lg:block">
                {results.filter((c) => c.id !== selectedId).map((c) => (
                  <button key={c.id} type="button" onClick={() => setSelectedId(c.id)} className="card block w-full p-3 text-left hover:border-orange-300">
                    <span className="block font-black">{c.name}</span>
                    <span className="text-xs text-slate-500">★ {c.rating.toFixed(1)} · {formatKm(c.distance)} · {c.area}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFilters(defaultFilters)} disabled={activeCount === 0}>
              Clear all
            </button>
            <Button type="button" className="flex-1" onClick={() => setSheetOpen(false)}>
              Show {results.length} center{results.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <FilterFields filters={filters} onChange={setFilters} layout="stack" />
      </BottomSheet>
    </>
  );
}