"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import type { LatLng } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[320px] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">
      Loading map...
    </div>
  ),
});

export type PickedLocation = LatLng & { 
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type SearchResult = { 
  place_id: number; 
  display_name: string; 
  lat: string; 
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
};

const DEFAULT_CENTER: LatLng = { lat: 18.5204, lng: 73.8567 }; // Pune

async function reverseGeocode({ lat, lng }: LatLng): Promise<PickedLocation> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    const addressDetails = data.address || {};
    const city = addressDetails.city || addressDetails.town || addressDetails.village || "";
    const state = addressDetails.state || "";
    const pincode = addressDetails.postcode || "";
    const address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    return { lat, lng, address, city, state, pincode };
  } catch {
    return { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

export default function LocationPicker({
  value,
  onChange,
  height = 320,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  height?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);

  const position: LatLng = value ?? DEFAULT_CENTER;

  async function pick(next: LatLng, knownResult?: SearchResult) {
    const id = ++requestId.current;
    
    if (knownResult) {
      const addr = knownResult.address || {};
      const city = addr.city || addr.town || addr.village || "";
      const state = addr.state || "";
      const pincode = addr.postcode || "";
      onChange({ ...next, address: knownResult.display_name, city, state, pincode });
      return;
    }

    // Show pin right away, then fetch details via reverse geocode
    onChange({ ...next, address: "Finding address..." });
    const locationData = await reverseGeocode(next);
    if (id === requestId.current) {
      onChange(locationData);
    }
  }

  // Debounced place search with addressdetails=1
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=1&q=${encodeURIComponent(text)}`,
        );
        setResults(res.ok ? await res.json() : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Location is not supported on this device.");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        pick({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setLocating(false);
        setMessage("Could not get your location. Allow location access or search below.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search area, street or landmark"
          className="input pl-10 pr-10"
        />
        {searching && (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
        )}
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
            {results.map((result) => (
              <li key={result.place_id}>
                <button
                  type="button"
                  onClick={() => {
                    pick({ lat: Number(result.lat), lng: Number(result.lon) }, result);
                    setQuery("");
                    setResults([]);
                  }}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-orange-50"
                >
                  <MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />
                  <span>{result.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 disabled:opacity-60"
      >
        {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
        Use my current location
      </button>
      {message && <p className="text-xs text-rose-600">{message}</p>}

      <MapView position={position} onPick={(next) => pick(next)} height={height} />

      <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
        <MapPin size={18} className="mt-0.5 shrink-0 text-orange-500" />
        <p className={value ? "text-slate-700" : "text-slate-400"}>
          {value ? value.address : "Tap on the map or drag the pin to set your location"}
        </p>
      </div>
    </div>
  );
}