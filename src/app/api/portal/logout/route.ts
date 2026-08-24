import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";

// Explicit 303: NextResponse.redirect() defaults to a 307, which
// preserves the original request method — since this route is only ever
// hit by a POST, a 307 here made the browser re-POST to /portal/login
// (a GET-only page), producing a 405. Same bug and fix as
// /api/platform/logout.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/portal/login", request.url), 303);
}
