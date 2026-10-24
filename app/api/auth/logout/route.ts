import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/server/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();   // Supabase mein session khatam + cookies hata di jati hain
  return NextResponse.json({ ok: true });
}