import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { TENANT_GRAPH_SCOPES } from "@/lib/tenant-graph-auth";

// Initiates the tenant inbox-connect flow — kept as its own route rather
// than a plain <a href> straight to Microsoft's authorize endpoint (the
// pattern /admin/ms-setup uses for Hamish's single internal account)
// because this flow is multi-tenant and self-serve: without a state
// nonce tied to *this* browser, an attacker could start the OAuth flow
// for their own Microsoft account, trick a signed-in tenant into opening
// the resulting callback URL, and get their own mailbox linked as that
// tenant's "connected inbox" (classic OAuth login-CSRF on an
// account-linking flow). The short-lived httpOnly cookie set here is
// checked against `state` at /api/platform/ms-callback before anything
// is written.
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL("/platform/signup", request.url));

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return NextResponse.redirect(new URL("/platform/onboarding", request.url));

  const clientId = process.env.PLATFORM_MS_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("<p>Inbox connections aren't configured yet — PLATFORM_MS_CLIENT_ID is not set.</p>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/platform/ms-callback`;
  const state = randomBytes(24).toString("hex");

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: TENANT_GRAPH_SCOPES.join(" "),
    state,
    prompt: "consent",
  }).toString()}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ms_connect_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
