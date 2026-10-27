"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "../../lib/geo";

export type MapCenter = { id: string; name: string; rating: number; location: LatLng };

const centerIcon = (rating: number, selected: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [58, 30],
    iconAnchor: [29, 30],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:58px;height:30px;border-radius:15px;font:800 13px system-ui;color:#fff;background:${
      selected ? "#ea580c" : "#0f172a"
    };border:2px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.35)">${rating > 0 ? `★ ${rating.toFixed(1)}` : "New"}</div>`,
  });

const userIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#2563eb;border:4px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>`,
});

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function ServiceCentersMap({
  centers,
  user,
  selectedId,
  onSelect,
  height = 520,
}: {
  centers: MapCenter[];
  user: LatLng;
  selectedId: string | null;
  onSelect: (id: string) => void;
  height?: number;
}) {
  return (
    <MapContainer center={[user.lat, user.lng]} zoom={13} scrollWheelZoom style={{ height, width: "100%" }} className="isolate z-0 rounded-2xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={[user, ...centers.map((c) => c.location)]} />
      <Marker position={[user.lat, user.lng]} icon={userIcon} />
      {centers.map((c) => (
        <Marker
          key={c.id}
          position={[c.location.lat, c.location.lng]}
          icon={centerIcon(c.rating, c.id === selectedId)}
          eventHandlers={{ click: () => onSelect(c.id) }}
        />
      ))}
    </MapContainer>
  );
}