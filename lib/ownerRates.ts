"use client";

import { useCallback, useEffect, useState } from "react";

/** One rate the owner fixes, e.g. "Oil Change" for 799. A price of 0 means "Free". */
export type RateItem = { id: string; name: string; price: number; note?: string };
export type OwnerRates = { services: RateItem[]; facilities: RateItem[] };

export const emptyRates: OwnerRates = { services: [], facilities: [] };

/** Quick-add suggestions on the My Rates page. */
export const facilitySuggestions = [
  "Pickup & drop",
  "Inspection / diagnosis",
  "Towing / roadside assistance",
  "Car wash add-on",
  "Express service (same day)",
  "Waiting lounge",
];

const key = (tenantId: string) => `vehicle-service-platform.rates.${tenantId}`;

const asItems = (value: unknown): RateItem[] =>
  Array.isArray(value)
    ? value.flatMap((v) => {
        const r = v as Partial<RateItem> | null;
        return r && typeof r.id === "string" && typeof r.name === "string" && typeof r.price === "number" ? [{ id: r.id, name: r.name, price: r.price, note: typeof r.note === "string" ? r.note : undefined }] : [];
      })
    : [];

/** Rates the owner of this tenant saved, or null when none were saved yet. */
export function loadOwnerRates(tenantId: string): OwnerRates | null {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(key(tenantId)) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    return { services: asItems(r.services), facilities: asItems(r.facilities) };
  } catch {
    return null;
  }
}

export function saveOwnerRates(tenantId: string, rates: OwnerRates) {
  try {
    window.localStorage.setItem(key(tenantId), JSON.stringify(rates));
  } catch {}
}

/**
 * Demo link between the customer list (mock centres sc1, sc2 ...) and tenants (TEN001, TEN002 ...)
 * until the backend returns the tenant id with each centre.
 */
export const tenantIdForCenter = (centerId: string) => `TEN${centerId.replace(/\D/g, "").padStart(3, "0")}`;
export const centerIdForTenant = (tenantId: string) => `sc${Number(tenantId.replace(/\D/g, "")) || 0}`;

export const rateLabel = (price: number) => (price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`);

/** Saved rates of a tenant. `loaded` is false until localStorage has been read. */
export function useOwnerRates(tenantId: string | undefined) {
  const [rates, setRates] = useState<OwnerRates | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setRates(loadOwnerRates(tenantId));
    setLoaded(true);
  }, [tenantId]);

  const save = useCallback(
    (next: OwnerRates) => {
      if (!tenantId) return;
      saveOwnerRates(tenantId, next);
      setRates(next);
    },
    [tenantId],
  );

  return { rates, loaded, save };
}