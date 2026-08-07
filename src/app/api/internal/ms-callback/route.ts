import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GRAPH_SCOPES } from "@/lib/ms-graph-auth";

// Under /api/internal/, so it's already gated by the existing admin-cookie
// middleware (see middleware.ts matcher) — no separate auth check needed
// here. Unlike google-callback.ts, this doesn't display the refresh token
// for the operator to copy into an env var — Microsoft's rotates on every
// use (see ms-graph-auth.ts), so it's written straight to ms_graph_tokens
// instead. Nothing to lose by refreshing the page; reconnecting from
// /admin/ms-setup mints a new one either way.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return new NextResponse(
      `<p>Microsoft returned an error: ${error}${errorDescription ? ` — ${errorDescription}` : ""}</p>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
  if (!code) {
    return new NextResponse("<p>Missing authorization code.</p>", { headers: { "Content-Type": "text/html" } });
  }

  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID;
  if (!clientId || !clientSecret || !tenantId) {
    return new NextResponse("<p>MS_CLIENT_ID / MS_CLIENT_SECRET / MS_TENANT_ID are not set.</p>", {
      headers: { "Content-Type": "text/html" },
    });
  }

  const redirectUri = `${origin}/api/internal/ms-callback`;

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: GRAPH_SCOPES.join(" "),
      }),
    });

    if (!tokenRes.ok) {
      console.error("Microsoft token exchange failed:", await tokenRes.text());
      return new NextResponse("<p>Failed to exchange the authorization code — check the server logs.</p>", {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokens = (await tokenRes.json()) as { refresh_token?: string };
    if (!tokens.refresh_token) {
      return new NextResponse(
        `<p>No refresh token was returned — make sure the app registration requests <code>offline_access</code> and try connecting again.</p>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return new NextResponse("<p>Supabase is not configured — can't store the token.</p>", {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { error: dbError } = await supabase
      .from("ms_graph_tokens")
      .upsert({ id: "default", refresh_token: tokens.refresh_token, updated_at: new Date().toISOString() });
    if (dbError) {
      console.error("Failed to store Microsoft refresh token:", dbError);
      return new NextResponse("<p>Token exchange worked but saving it failed — check the server logs.</p>", {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new NextResponse(
      `<!doctype html><html><body style="font-family: system-ui; max-width: 640px; margin: 4rem auto; line-height: 1.6;">
        <h1>Connected</h1>
        <p>Your Microsoft account is connected — nothing further to copy or configure. <a href="/admin/ms-setup">Back to the connection page</a>.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Microsoft OAuth token exchange failed:", err);
    return new NextResponse("<p>Failed to exchange the authorization code — check the server logs.</p>", {
      headers: { "Content-Type": "text/html" },
    });
  }
}
