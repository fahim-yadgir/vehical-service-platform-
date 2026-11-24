import { z } from "zod";
import { getCentreDb } from "@/backend/db";
import { verifyPassword, hashPassword } from "@/backend/utils/password";
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
  portal: z.enum(["admin","centre"])
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200).regex(/[A-Za-z]/).regex(/\d/),
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

  const { mobile, password, portal } = parsed.data;
  const db = getCentreDb();

  const user = await db
    .prepare(
      "SELECT id, tenant_id, role, name, mobile, password_hash, must_change_password, status FROM users WHERE mobile = ?"
    )
    .bind(mobile)
    .first<UserRow>();

  const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordOk) return NextResponse.json(INVALID, { status: 401 });

  // Galat portal pe wahi message, taaki pata na chale ki ye admin ka mobile hai
  const portalAllowed = portal === "admin" ? user.role === "admin" : user.role !== "admin";
  if (!portalAllowed) return NextResponse.json(INVALID, { status: 401 });

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

export async function changePasswordController(request: NextRequest): Promise<NextResponse> {
  // TODO: rate limit (purana password guess karne se rokne ke liye)
  const db = getCentreDb();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(db, token);
  if (!user || !token) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. New password must be at least 8 characters." },
      { status: 400 }
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current password" },
      { status: 400 }
    );
  }

  const row = await db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ password_hash: string }>();

  const currentOk = await verifyPassword(currentPassword, row?.password_hash ?? DUMMY_HASH);
  if (!row || !currentOk) {
    // 400, 401 nahi: frontend 401 ko "session khatam" maanke logout na kar de
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const currentTokenHash = await hashToken(token);

  // Dono updates ek transaction me: password badlo aur baaki sessions band karo
  await db.batch([
    db
      .prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?")
      .bind(newHash, now, user.id),
    db
      .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND token_hash <> ?")
      .bind(now, user.id, currentTokenHash),
  ]);

  return NextResponse.json({ ok: true });
}