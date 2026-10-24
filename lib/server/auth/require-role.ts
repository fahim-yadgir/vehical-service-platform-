import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabase/server";

export type Role = "super_admin" | "owner" | "manager" | "staff" | "customer";

export async function requireRole(
  allowed: Role[],
  options: { allowMustChangePassword?: boolean } = {}
) {
  const supabase = await createClient();

  // 1. Login check (token Supabase se verify hota hai)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Pehle login karo" }, { status: 401 }),
    };
  }

  // 2. Role aur status database se (request se kabhi nahi)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, must_change_password, service_centre_id")
    .eq("id", user.id)
    .single();

  // 3. Account active hai?
  if (!profile || profile.status !== "active") {
    return {
      error: NextResponse.json(
        { error: "Aapka account active nahi hai" },
        { status: 403 }
      ),
    };
  }

  // 4. Temporary password abhi badla nahi?
  if (profile.must_change_password && !options.allowMustChangePassword) {
    return {
      error: NextResponse.json(
        { error: "Pehle apna password badlo" },
        { status: 403 }
      ),
    };
  }

  // 5. Role allowed hai?
  if (!allowed.includes(profile.role as Role)) {
    return {
      error: NextResponse.json(
        { error: "Aapko iski ijazat nahi hai" },
        { status: 403 }
      ),
    };
  }

  return { error: null, user, profile, supabase };
}