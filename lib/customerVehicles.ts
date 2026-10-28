"use client";
import { useEffect, useState } from "react";
import { getSessionAccount } from "./tenantAccounts";
import { vehicles as seed } from "./mock-data";
import type { Order } from "./orders";

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

const keyNow = () => {
  const mobile = getSessionAccount()?.mobile;
  return mobile ? `${KEY}.${mobile}` : KEY;
};

/** Replace with an API call once the backend is ready. A new customer starts with an empty garage. */
export function loadVehicles(): CustomerVehicle[] {
  try {
    const saved = window.localStorage.getItem(keyNow());
    if (saved) return JSON.parse(saved) as CustomerVehicle[];
  } catch {}
  return getSessionAccount() ? [] : (seed as CustomerVehicle[]);
}

export function saveVehicles(items: CustomerVehicle[]) {
  try {
    window.localStorage.setItem(keyNow(), JSON.stringify(items));
  } catch {}
}

/** Shared by dashboard, vehicles and history pages. `ready` is false until localStorage is read. */
export function useVehicles() {
  const [items, setItems] = useState<CustomerVehicle[]>([]);
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

/** Real orders of one vehicle, matched by registration number. */
export const ordersForVehicle = (orders: Order[], v?: CustomerVehicle) =>
  v ? orders.filter((o) => o.vehicle.registrationNo.trim().toLowerCase() === v.registration.trim().toLowerCase()) : [];