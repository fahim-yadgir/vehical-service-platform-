export const isMobile = (value: string) => /^[6-9]\d{9}$/.test(value.trim());

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isMobileOrEmail = (value: string) =>
  isMobile(value) || isEmail(value);