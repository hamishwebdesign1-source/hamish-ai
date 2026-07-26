import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { ADMIN_COOKIE_NAME, hashAdminPassword } from "@/lib/admin-auth";

// Magic-link sign-in for /admin — an alternative to typing the shared
// password each time. Unlike the portal (open to any email that matches a
// client record), this is gated to exactly one address, ADMIN_EMAIL, since
// there's only one operator. On success it sets the same ADMIN_COOKIE the
// password form sets, so middleware.ts needs no changes at all.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createServerSupabaseClient();

  let email: string | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) email = data.user?.email ?? null;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });
    if (!error) email = data.user?.email ?? null;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (email && adminEmail && adminPassword && email.toLowerCase() === adminEmail.toLowerCase()) {
    const token = await hashAdminPassword(adminPassword);
    const store = await cookies();
    store.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.redirect(`${origin}/admin`);
  }

  return NextResponse.redirect(`${origin}/admin/login?error=1`);
}
