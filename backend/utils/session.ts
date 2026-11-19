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
export type SessionUser = {
  id: string;
  name: string;
  role: "admin" | "owner" | "manager" | "staff";
  tenantId: string | null;
  mustChangePassword: boolean;
};

type SessionRow = {
  id: string;
  name: string;
  role: SessionUser["role"];
  tenant_id: string | null;
  must_change_password: number;
  status: string;
  tenant_status: string | null;
};

// Cookie ke token se logged-in user nikalta hai. Valid na ho to null.
export async function getSessionUser(db: D1Database, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  const row = await db
    .prepare(
      `SELECT u.id, u.name, u.role, u.tenant_id, u.must_change_password, u.status,
              t.status AS tenant_status
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`
    )
    .bind(await hashToken(token), new Date().toISOString())
    .first<SessionRow>();

  if (!row) return null;
  if (row.status !== "Active") return null;
  if (row.tenant_id && row.tenant_status !== "Active") return null;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    tenantId: row.tenant_id,
    mustChangePassword: row.must_change_password === 1,
  };
}