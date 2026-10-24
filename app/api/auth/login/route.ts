import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../../lib/server/supabase/server";

const bodySchema = z.object({
  mobile: z.string().min(10).max(20),
  password: z.string().min(1).max(128),
});

// 10 digit ka Indian number ho to +91 laga do
function normalizeMobile(input: string) {
  const v = input.replace(/[\s-]/g, "");
  if (/^[6-9]\d{9}$/.test(v)) return `+91${v}`;
  if (/^\+[1-9]\d{9,14}$/.test(v)) return v;
  return null;
}

export async function POST(request: Request) {
  // 1. Body padho aur check karo
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  const phone = parsed.success ? normalizeMobile(parsed.data.mobile) : null;
  if (!parsed.success || !phone) {
    return NextResponse.json(
      { error: "Mobile number aur password not matched" },
      { status: 400 }
    );
  }

  // 2. Supabase se login (cookies apne aap set ho jayengi)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Too mane attempts!, Try again after some time" },
        { status: 429 }
      );
    }
    // Hamesha ek jaisa jawab, taaki pata na chale kaun sa mobile registered hai
    return NextResponse.json(
      { error: "Mobile number or password are wrong" },
      { status: 401 }
    );
  }

  // 3. profiles se role aur status padho
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, status, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();   // session aur cookies hata do
    return NextResponse.json(
      { error: "Your account is not active, please contact super admin" },
      { status: 403 }
    );
  }

  // 4. Frontend ko bas zaruri cheezein bhejo (token nahi, wo cookie mein hai)
  return NextResponse.json({
    user: { id: data.user.id, role: profile.role, fullName: profile.full_name },
    mustChangePassword: profile.must_change_password,
  });
}