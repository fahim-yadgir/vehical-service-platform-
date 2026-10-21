export const PROFILE_KEY = "customer.profile";

export const defaultProfile = {
  fullName: "Fahim Yadgir",
  mobile: "9876543210",
  email: "fahim@example.com",
  age: "26",
  gender: "Male",
  address: "Flat 402, Sunrise Apartments",
};

export type CustomerProfile = typeof defaultProfile;

/** Replace with an API call once the backend is ready. */
export function loadProfile(): CustomerProfile {
  try {
    const saved = window.localStorage.getItem(PROFILE_KEY);
    if (saved) return { ...defaultProfile, ...JSON.parse(saved) };
  } catch {}
  return defaultProfile;
}

export function saveProfile(profile: CustomerProfile) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}