"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { LocateFixed, MapPin, SlidersHorizontal } from "lucide-react";
import Topbar from "@/components/navbar/Topbar";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import LocationPicker, { type PickedLocation } from "@/components/map/LocationPicker";
import ServiceCenterCard from "@/components/customer/ServiceCenterCard";
import { ActiveFilterChips, FilterFields, countActive, defaultFilters, type Filters } from "@/components/customer/ServiceCenterFilters";
import { liveServiceOptions, useLiveCenters } from "@/lib/liveCenters";
import { distanceKm } from "@/lib/geo";
import { DEFAULT_LOCATION, loadLocation, saveLocation, type SavedLocation } from "@/lib/customerLocation";

const ServiceCentersMap = dynamic(() => import("@/components/map/ServiceCentersMap"), {
  ssr: false,
  loading: () => <div className="grid h-[520px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">Loading map...</div>,
});

/**
 * Two modes, like a shop:
 *  - at first every live centre is shown as a card, with no distance, map or distance filter;
 *  - once the customer opens the location card and confirms a place, centres are sorted by distance and the map appears.
 */
function ServiceCentersList() {
  const params = useSearchParams();
  const { centers, ready } = useLiveCenters();
  const [saved, setSaved] = useState<SavedLocation | null>(null);
  const [useNearby, setUseNearby] = useState(false); // false at start, on purpose
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<PickedLocation | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, service: params.get("service") ?? "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    setSaved(loadLocation());
  }, []);

  const location = saved ?? DEFAULT_LOCATION;
  const options = useMemo(() => liveServiceOptions(centers), [centers]);

  const results = useMemo(() => {
    const byService = centers.filter((c) => filters.service === "all" || c.services.includes(filters.service));
    if (!useNearby) return byService.map((c) => ({ ...c, distance: undefined as number | undefined })).sort((a, z) => a.name.localeCompare(z.name));
    const list = byService
      .map((c) => ({ ...c, distance: distanceKm(location, c.location) as number | undefined }))
      .filter((c) => !filters.maxKm || (c.distance ?? 0) <= filters.maxKm);
    return list.sort((a, z) => (filters.sort === "rating" ? z.rating - a.rating || (a.distance ?? 0) - (z.distance ?? 0) : (a.distance ?? 0) - (z.distance ?? 0)));
  }, [centers, location, filters, useNearby]);

  if (!ready) return <Topbar title="Service Centers" subtitle="Loading…" />;

  const openPicker = () => {
    setDraft({ ...location });
    setPicking(true);
  };
  const confirmLocation = () => {
    if (!draft || draft.address === "Finding address...") return;
    saveLocation(draft);
    setSaved(draft);
    setUseNearby(true);
    setPicking(false);
  };
  const showAll = () => {
    setUseNearby(false);
    setFilters({ ...filters, maxKm: 0, sort: "nearest" });
  };

  const active = countActive(filters);

  return (
    <>
      <Topbar title="Service Centers" subtitle={useNearby ? `${results.length} near ${location.address}` : `${results.length} service centre${results.length === 1 ? "" : "s"} on AutoServe`} />
      <div className="container space-y-5">
        {/* Location card */}
        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-500"><MapPin size={20} /></span>
            <div className="min-w-0">
              <p className="font-black text-slate-900">{useNearby ? "Showing centres near you" : "Find centres near you"}</p>
              <p className="muted truncate text-sm">
                {useNearby ? location.address : "Set your location to see distance, sort by nearest and view the map."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {saved && !useNearby && (
              <button type="button" onClick={() => setUseNearby(true)} className="btn btn-primary text-sm"><LocateFixed size={16} /> Use saved location</button>
            )}
            <button type="button" onClick={openPicker} className={`btn text-sm ${saved && !useNearby ? "btn-secondary" : useNearby ? "btn-secondary" : "btn-primary"}`}>
              {saved ? "Change location" : "Set location"}
            </button>
            {useNearby && <button type="button" onClick={showAll} className="btn btn-secondary text-sm">Show all centres</button>}
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {useNearby ? (
            <>
              <div className="hidden flex-wrap items-center gap-3 md:flex">
                <FilterFields filters={filters} onChange={setFilters} layout="inline" serviceOptions={options} />
              </div>
              <button type="button" onClick={() => setSheet(true)} className="btn btn-secondary md:hidden">
                <SlidersHorizontal size={16} /> Filters{active ? ` (${active})` : ""}
              </button>
              <ActiveFilterChips filters={filters} onChange={setFilters} />
            </>
          ) : (
            <select value={filters.service} onChange={(e) => setFilters({ ...filters, service: e.target.value })} aria-label="Service" className="input" style={{ width: "auto" }}>
              <option value="all">All services</option>
              {options.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>

        {centers.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-black">No service centres are listed yet</p>
            <p className="muted mt-1 text-sm">A centre appears here once its plan is active and the owner has saved the address and map pin.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-black">No centres match these filters</p>
            <button type="button" className="btn btn-secondary mt-4" onClick={() => setFilters(defaultFilters)}>Clear filters</button>
          </div>
        ) : useNearby ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              {results.map((c) => (
                <div key={c.id} onMouseEnter={() => setSelectedId(c.id)}>
                  <ServiceCenterCard center={c} selected={c.id === selectedId} />
                </div>
              ))}
            </div>
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <ServiceCentersMap centers={results} user={location} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((c) => <ServiceCenterCard key={c.id} center={c} />)}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filters"
        footer={<Button type="button" className="w-full" onClick={() => setSheet(false)}>Show {results.length} centres</Button>}
      >
        <FilterFields filters={filters} onChange={setFilters} layout="stack" serviceOptions={options} />
      </BottomSheet>

      <BottomSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Your location"
        footer={<Button type="button" className="w-full" onClick={confirmLocation}>Show centres near here</Button>}
      >
        <LocationPicker value={draft} onChange={setDraft} height={300} />
      </BottomSheet>
    </>
  );
}

export default function ServiceCentersPage() {
  return (
    <Suspense fallback={<Topbar title="Service Centers" subtitle="Loading…" />}>
      <ServiceCentersList />
    </Suspense>
  );
}