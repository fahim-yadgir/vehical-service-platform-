"use client";
import { useEffect, useState } from "react";
import { bookings, vehicles as seed } from "./mock-data";

export type CustomerVehicle = {
  id: string;
  brand: string;
  model: string;
  type: string;
  registration: string;
  year: number;
  lastService: string;
  chassisNo?: string;
  engineNo?: string;
  health?: number;
};

const KEY = "customer.vehicles";

/** Replace with an API call once the backend is ready. */
export function loadVehicles(): CustomerVehicle[] {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved) as CustomerVehicle[];
  } catch {}
  return seed as CustomerVehicle[];
}

export function saveVehicles(items: CustomerVehicle[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

/** Shared by dashboard, vehicles and history pages. `ready` is false until localStorage is read. */
export function useVehicles() {
  const [items, setItems] = useState<CustomerVehicle[]>(seed as CustomerVehicle[]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadVehicles());
    setReady(true);
  }, []);

  const update = (next: CustomerVehicle[]) => {
    setItems(next);
    saveVehicles(next);
  };

  return { vehicles: items, setVehicles: update, ready };
}

export const vehicleName = (v: CustomerVehicle) => `${v.brand} ${v.model}`;

/** Bookings of one vehicle (booking.vehicle is stored as "Brand Model"). */
export const bookingsForVehicle = (v?: CustomerVehicle) =>
  v ? bookings.filter((b) => b.vehicle.toLowerCase() === vehicleName(v).toLowerCase()) : [];