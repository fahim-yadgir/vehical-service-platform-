import { getSessionAccount } from "./tenantAccounts";

export const PROFILE_KEY = "customer.profile";

/** Each customer account keeps its own profile. The old shared key is only used by the demo customer. */
const keyFor = (mobile?: string) => (mobile ? `${PROFILE_KEY}.${mobile}` : PROFILE_KEY);

export const defaultProfile = {
  fullName: "Fahim Yadgir",
  mobile: "9876543210",
  email: "fahim@example.com",
  age: "26",
  gender: "Male",
  address: "Flat 402, Sunrise Apartments",
};

export type CustomerProfile = typeof defaultProfile;

export const emptyProfile: CustomerProfile = { fullName: "", mobile: "", email: "", age: "", gender: "", address: "" };

/** Replace with an API call once the backend is ready. */
export function loadProfile(): CustomerProfile {
  const account = getSessionAccount();
  try {
    const saved = window.localStorage.getItem(keyFor(account?.mobile));
    if (saved) return { ...(account ? emptyProfile : defaultProfile), ...JSON.parse(saved) };
  } catch {}
  if (account) return { ...emptyProfile, fullName: account.name, mobile: account.mobile, email: account.email ?? "" };
  return defaultProfile;
}

export function saveProfile(profile: CustomerProfile) {
  try {
    window.localStorage.setItem(keyFor(getSessionAccount()?.mobile), JSON.stringify(profile));
  } catch {}
}

/** Used right after registration, before anyone is signed in. */
export function createCustomerProfile(profile: CustomerProfile) {
  try {
    window.localStorage.setItem(keyFor(profile.mobile), JSON.stringify(profile));
  } catch {}
}

/** A customer needs a house / flat address and a map location before booking. */
export const hasHouseAddress = (p: CustomerProfile) => p.address.trim().length >= 2;