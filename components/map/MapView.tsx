"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type LatLng = { lat: number; lng: number };

// Custom pin so we don't depend on Leaflet's default image assets.
const pinIcon = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  html: `<div style="position:relative;width:34px;height:44px">
    <div style="position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50% 50% 50% 0;background:#f97316;transform:rotate(-45deg);box-shadow:0 6px 14px rgba(249,115,22,.45);border:3px solid #fff"></div>
    <div style="position:absolute;left:11px;top:11px;width:12px;height:12px;border-radius:50%;background:#fff"></div>
  </div>`,
});

function ClickToPick({ onPick }: { onPick: (position: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [map, position.lat, position.lng]);
  return null;
}

export default function MapView({
  position,
  onPick,
  height = 320,
}: {
  position: LatLng;
  onPick: (position: LatLng) => void;
  height?: number;
}) {
  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={15}
      scrollWheelZoom
      style={{ height, width: "100%" }}
      className="isolate z-0 rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={onPick} />
      <FlyTo position={position} />
      <Marker
        position={[position.lat, position.lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend(event) {
            const { lat, lng } = (event.target as L.Marker).getLatLng();
            onPick({ lat, lng });
          },
        }}
      />
    </MapContainer>
  );
}