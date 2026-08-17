import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";

// Mirrors /api/portal/logout exactly, redirecting to /platform/signup
// instead of /portal/login.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/platform/signup", request.url));
}
