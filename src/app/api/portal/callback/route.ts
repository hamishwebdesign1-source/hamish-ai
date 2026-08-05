import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { logInfo, logWarn } from "@/lib/structured-log";

// The redirect target Supabase sends a client to after they click their
// magic-link email. Handles both confirmation formats Supabase can produce:
// a PKCE `code` (exchanged via exchangeCodeForSession, requires the request
// to originate from the same browser that requested the link) and a
// `token_hash`+`type` pair (verified via verifyOtp, no code-verifier
// needed — this is what admin.generateLink() produces, and what some
// Supabase project configurations use for the email template too).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logInfo("portal_auth.login_success", { email: data.user?.email ?? null, method: "code" });
      return NextResponse.redirect(`${origin}/portal`);
    }
    logWarn("portal_auth.login_failed", { method: "code", message: error.message });
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });
    if (!error) {
      logInfo("portal_auth.login_success", { email: data.user?.email ?? null, method: "token_hash" });
      return NextResponse.redirect(`${origin}/portal`);
    }
    logWarn("portal_auth.login_failed", { method: "token_hash", message: error.message });
  }

  return NextResponse.redirect(`${origin}/portal/login?error=1`);
}
