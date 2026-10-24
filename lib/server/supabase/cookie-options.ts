// Login route aur proxy.ts, dono yahi options use karenge,
// taaki refresh ke baad cookie dobara non-httpOnly na ban jaye.
export const cookieOptions = {
  httpOnly: true,                                   // JS cookie padh nahi sakta
  secure: process.env.NODE_ENV === "production",    // live par sirf HTTPS
  sameSite: "lax",                                  // CSRF se bachav
  path: "/",
} as const;