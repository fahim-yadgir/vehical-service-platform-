"use client";

import { useCallback, useEffect, useState } from "react";

/** Service centre details the owner fills in after the admin creates the account. */
export type OwnerProfile = {
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  /** Map pin. Required for the centre to appear to customers. */
  lat?: number;
  lng?: number;
};

export const emptyProfile: OwnerProfile = { email: "", gstin: "", address: "", city: "", state: "Maharashtra", pincode: "" };

const key = (tenantId: string) => `vehicle-service-platform.owner-profile.${tenantId}`;

export function loadOwnerProfile(tenantId: string): OwnerProfile | null {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(key(tenantId)) ?? "null");
    return raw && typeof raw === "object" ? { ...emptyProfile, ...(raw as Partial<OwnerProfile>) } : null;
  } catch {
    return null;
  }
}

export function saveOwnerProfile(tenantId: string, profile: OwnerProfile) {
  try {
    window.localStorage.setItem(key(tenantId), JSON.stringify(profile));
  } catch {}
}

/** Address fields every centre must have before customers can find it. GSTIN stays optional. */
export const isProfileComplete = (p: OwnerProfile | null) =>
  !!p && !!p.address.trim() && !!p.city.trim() && !!p.state.trim() && !!p.pincode.trim();

export const hasMapPin = (p: OwnerProfile | null) => !!p && typeof p.lat === "number" && typeof p.lng === "number";

/** Customers see a centre only when the address AND the map pin are saved. */
export const isListedOnApp = (p: OwnerProfile | null) => isProfileComplete(p) && hasMapPin(p);

/** Saved profile of a tenant. `loaded` is false until localStorage has been read. */
export function useOwnerProfile(tenantId: string | undefined) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setProfile(loadOwnerProfile(tenantId));
    setLoaded(true);
  }, [tenantId]);

  const save = useCallback(
    (next: OwnerProfile) => {
      if (!tenantId) return;
      saveOwnerProfile(tenantId, next);
      setProfile(next);
    },
    [tenantId],
  );

  return { profile, loaded, save };
}