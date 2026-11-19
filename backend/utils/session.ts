export const SESSION_COOKIE = "vsp_session";
const SESSION_DAYS = 30;

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

// DB me token nahi, uska hash store hota hai.
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(db: D1Database, userId: string, device: string | null) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, token_hash, device, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), userId, await hashToken(token), device, now.toISOString(), expiresAt.toISOString())
    .run();

  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}