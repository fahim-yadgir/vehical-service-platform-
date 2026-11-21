import { NextRequest, NextResponse } from "next/server";
import { getCentreDb } from "@/backend/db";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "@/backend/utils/session";

export type Role = SessionUser["role"]; // "admin" | "owner" | "manager" | "staff"

type GuardOptions = {
  // Sirf change-password route true dega. Baaki sab routes pe temporary-password wala user rukega.
  allowPasswordChange?: boolean;
};

type GuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireRole(
  request: NextRequest,
  allowedRoles: Role[],
  options: GuardOptions = {}
): Promise<GuardResult> {
  const db = getCentreDb();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(db, token);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not logged in" }, { status: 401 }),
    };
  }

  // Temporary password wala user pehle password badlega, tab hi kuch aur kar paayega.
  if (user.mustChangePassword && !options.allowPasswordChange) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}