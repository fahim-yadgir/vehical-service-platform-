export type SavedLocation = { lat: number; lng: number; address: string };

export const LOCATION_STORAGE_KEY = "customer.serviceCenters.location";

/** Default = the customer's saved home address (mock). Replace with the real address from the profile/API. */
export const DEFAULT_LOCATION: SavedLocation = {
  lat: 18.5679,
  lng: 73.9143,
  address: "Viman Nagar, Pune, Maharashtra",
};

export function loadLocation(): SavedLocation | null {
  try {
    const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as SavedLocation) : null;
  } catch {
    return null;
  }
}

export function saveLocation(location: SavedLocation) {
  try {
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {}
}