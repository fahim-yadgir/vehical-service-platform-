export const isMobile = (value: string) => /^[6-9]\d{9}$/.test(value.trim());

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isMobileOrEmail = (value: string) =>
  isMobile(value) || isEmail(value);

/** 15-character GSTIN, e.g. 27ABCDE1234F1Z5. */
export const isGst = (value: string) =>
  /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase());

export const isPincode = (value: string) => /^[1-9]\d{5}$/.test(value.trim());
