import { z } from "zod";
import { getCentreDb } from "@/backend/db";
import { verifyPassword } from "@/backend/utils/password";
import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSessionUser,
  hashToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/backend/utils/session";
const loginSchema = z.object({
  mobile: z.string().trim().regex(/^\d{10}$/),
  password: z.string().min(1).max(200),
});

type UserRow = {
  id: string;
  tenant_id: string | null;
  role: "admin" | "owner" | "manager" | "staff";
  name: string;
  mobile: string;
  password_hash: string;
  must_change_password: number;
  status: "Active" | "Suspended";
};

// Throwaway hash: mobile na mile tab bhi verify chalta hai, taaki response time same rahe.
const DUMMY_HASH =
  "pbkdf2$sha256$100000$zE1CVr45ZCF9JpZeDqZjpg==$KfGELTCZaeUV5zNl+REbdvVwp7GkLk+eUiPBQzdt6/A=";

const INVALID = { error: "Invalid mobile number or password" };

export async function loginController(request: Request): Promise<NextResponse> {
  // TODO: login attempts ki rate limit (5 fail par ruk jao)
  const raw = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json(INVALID, { status: 400 });

  const { mobile, password } = parsed.data;
  const db = getCentreDb();

  const user = await db
    .prepare(
      "SELECT id, tenant_id, role, name, mobile, password_hash, must_change_password, status FROM users WHERE mobile = ?"
    )
    .bind(mobile)
    .first<UserRow>();

  const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordOk) return NextResponse.json(INVALID, { status: 401 });

  if (user.status !== "Active") {
    return NextResponse.json({ error: "Your account is suspended. Please contact support." }, { status: 403 });
  }

  if (user.tenant_id) {
    const tenant = await db
      .prepare("SELECT status FROM tenants WHERE id = ?")
      .bind(user.tenant_id)
      .first<{ status: string }>();
    if (!tenant || tenant.status !== "Active") {
      return NextResponse.json({ error: "This service centre is suspended. Please contact support." }, { status: 403 });
    }
  }

  const device = request.headers.get("user-agent")?.slice(0, 200) ?? null;
  const { token, expiresAt } = await createSession(db, user.id, device);

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      mustChangePassword: user.must_change_password === 1,
    },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return response;
}
export async function meController(request: NextRequest): Promise<NextResponse> {
  const db = getCentreDb();
  const user = await getSessionUser(db, request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function logoutController(request: NextRequest): Promise<NextResponse> {
  const db = getCentreDb();
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    await db
      .prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
      .bind(new Date().toISOString(), await hashToken(token))
      .run();
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(new Date(0)));
  return response;
}