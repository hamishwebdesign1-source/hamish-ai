import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";

// Mirrors /api/portal/logout exactly, redirecting to /platform/signup
// instead of /portal/login.
//
// Explicit 303: NextResponse.redirect() defaults to a 307, which
// preserves the original request method — since this route is only ever
// hit by a POST, a 307 here made the browser re-POST to /platform/signup
// (a GET-only page), producing a 405. 303 (See Other) is the one status
// built for exactly this — always follow with a GET, regardless of what
// the original request's method was.
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/platform/signup", request.url), 303);
}
