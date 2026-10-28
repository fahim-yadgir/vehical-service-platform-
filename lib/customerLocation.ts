import { getSessionAccount } from "./tenantAccounts";

export type SavedLocation = { lat: number; lng: number; address: string };

export const LOCATION_STORAGE_KEY = "customer.serviceCenters.location";

const keyFor = (mobile?: string) => (mobile ? `${LOCATION_STORAGE_KEY}.${mobile}` : LOCATION_STORAGE_KEY);

/** Only a map fallback (Pune). A customer's real location is the one saved in their profile. */
export const DEFAULT_LOCATION: SavedLocation = {
  lat: 18.5679,
  lng: 73.9143,
  address: "Viman Nagar, Pune, Maharashtra",
};

export function loadLocation(): SavedLocation | null {
  try {
    const saved = window.localStorage.getItem(keyFor(getSessionAccount()?.mobile));
    return saved ? (JSON.parse(saved) as SavedLocation) : null;
  } catch {
    return null;
  }
}

export function saveLocation(location: SavedLocation) {
  try {
    window.localStorage.setItem(keyFor(getSessionAccount()?.mobile), JSON.stringify(location));
  } catch {}
}

/** Used right after registration, before anyone is signed in. */
export function saveLocationFor(mobile: string, location: SavedLocation) {
  try {
    window.localStorage.setItem(keyFor(mobile), JSON.stringify(location));
  } catch {}
}