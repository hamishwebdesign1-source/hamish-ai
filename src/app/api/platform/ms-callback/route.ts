import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { TENANT_GRAPH_SCOPES } from "@/lib/tenant-graph-auth";

// Tenant-facing sibling of /api/internal/ms-callback. Two things that
// route doesn't need but this one does, both because this flow is
// multi-tenant and self-serve rather than a single admin connecting
// their own account:
//
// 1. `state` is checked against the cookie set by /api/platform/ms-connect
//    before anything is written — see that route's comment for the CSRF
//    this closes.
// 2. The organisation this token gets attached to is re-derived from the
//    caller's own signed-in session, never trusted from the URL — the
//    same rule every Server Action in this app already follows.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ms_connect_state")?.value;
  cookieStore.delete("ms_connect_state");

  if (error) {
    return NextResponse.redirect(
      `${origin}/studio/settings?ms_error=${encodeURIComponent(errorDescription || error)}`
    );
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("That connection attempt expired or wasn't valid — try again.")}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/platform/signup`);

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return NextResponse.redirect(`${origin}/platform/onboarding`);

  const clientId = process.env.PLATFORM_MS_CLIENT_ID;
  const clientSecret = process.env.PLATFORM_MS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("Inbox connections aren't configured yet.")}`);
  }

  const redirectUri = `${origin}/api/platform/ms-callback`;

  try {
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: TENANT_GRAPH_SCOPES.join(" "),
      }),
    });

    if (!tokenRes.ok) {
      console.error("Tenant Microsoft token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("Failed to complete the connection — try again.")}`);
    }

    const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
    if (!tokens.refresh_token || !tokens.access_token) {
      return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("Microsoft didn't return a usable token — try again.")}`);
    }

    // One extra call to learn the connected mailbox's address, so the
    // settings page can show "Connected as you@business.com" rather than
    // just a bare "Connected" — worth the round trip for something the
    // tenant will want to confirm is the right inbox.
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = meRes.ok ? ((await meRes.json()) as { mail?: string; userPrincipalName?: string }) : {};
    const emailAddress = me.mail || me.userPrincipalName || "connected inbox";

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("Supabase is not configured.")}`);
    }

    const { error: dbError } = await admin.from("email_connections").upsert(
      {
        org_id: membership.orgId,
        provider: "microsoft",
        email_address: emailAddress,
        refresh_token: tokens.refresh_token,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "org_id,provider" }
    );
    if (dbError) {
      console.error("Failed to store tenant Microsoft refresh token:", dbError);
      return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("Connection succeeded but saving it failed — try again.")}`);
    }

    return NextResponse.redirect(`${origin}/studio/settings?ms_connected=1`);
  } catch (err) {
    console.error("Tenant Microsoft OAuth token exchange failed:", err);
    return NextResponse.redirect(`${origin}/studio/settings?ms_error=${encodeURIComponent("Failed to complete the connection — try again.")}`);
  }
}
