"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { Navigation } from "lucide-react";
import { distanceKm, navigateUrl, type Point } from "@/lib/navigation";

const youIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#2563eb;border:4px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>`,
});

const pickupIcon = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  html: `<div style="position:relative;width:34px;height:44px">
    <div style="position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50% 50% 50% 0;background:#f97316;transform:rotate(-45deg);box-shadow:0 6px 14px rgba(249,115,22,.45);border:3px solid #fff"></div>
    <div style="position:absolute;left:11px;top:11px;width:12px;height:12px;border-radius:50%;background:#fff"></div>
  </div>`,
});

function FitTo({ points, refitKey }: { points: Point[]; refitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [50, 50] });
    // refit only when the key changes (e.g. first GPS fix), not on every GPS update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, refitKey]);
  return null;
}

type Route = { coords: [number, number][]; km: number; mins: number };

export default function RouteMap({ destination, address, height = 380 }: { destination: Point; address: string; height?: number }) {
  const [me, setMe] = useState<Point | null>(null);
  const [geoError, setGeoError] = useState("");
  const [route, setRoute] = useState<Route | null>(null);
  const lastFetch = useRef<Point | null>(null);
  const inFlight = useRef(false);

  // live position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Location is not supported on this device.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setGeoError("");
        setMe({ lat: coords.latitude, lng: coords.longitude });
      },
      () => setGeoError("Allow location access to see your live position and the route."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // driving route (OSRM public demo server: fine for development, host your own router in production)
  useEffect(() => {
    if (!me || inFlight.current) return;
    if (lastFetch.current && distanceKm(lastFetch.current, me) < 0.15) return; // refresh only after moving ~150 m
    inFlight.current = true;
    lastFetch.current = me;
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${me.lng},${me.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const r = data.routes?.[0];
        if (!r) return;
        setRoute({
          coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
          km: r.distance / 1000,
          mins: Math.max(1, Math.round(r.duration / 60)),
        });
      })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, [me, destination.lat, destination.lng]);

  const points = me ? [me, destination] : [destination];
  const km = route?.km ?? (me ? distanceKm(me, destination) : null);

  return (
    <div className="space-y-3">
      <MapContainer center={[destination.lat, destination.lng]} zoom={15} scrollWheelZoom style={{ height, width: "100%" }} className="isolate z-0 rounded-2xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitTo points={points} refitKey={`${destination.lat},${destination.lng},${me ? "me" : "no"}`} />
        <Marker position={[destination.lat, destination.lng]} icon={pickupIcon} />
        {me && <Marker position={[me.lat, me.lng]} icon={youIcon} />}
        {route ? (
          <Polyline positions={route.coords} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }} />
        ) : (
          me && <Polyline positions={[[me.lat, me.lng], [destination.lat, destination.lng]]} pathOptions={{ color: "#94a3b8", weight: 3, dashArray: "6 8" }} />
        )}
      </MapContainer>

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pickup address</p>
          <p className="text-sm font-semibold text-slate-800">{address}</p>
          {km !== null && (
            <p className="mt-1 text-xs text-slate-500">
              {km.toFixed(1)} km away{route ? ` · about ${route.mins} min by road` : ""}
            </p>
          )}
          {geoError && <p className="mt-1 text-xs text-rose-600">{geoError}</p>}
        </div>
        <a
          href={navigateUrl(destination)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold !text-white hover:bg-blue-700"
        >
          <Navigation size={16} /> Navigate
        </a>
      </div>
    </div>
  );
}