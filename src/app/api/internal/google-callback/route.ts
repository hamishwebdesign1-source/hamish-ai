import { NextResponse } from "next/server";
import { google } from "googleapis";

// Under /api/internal/, so it's already gated by the existing admin-cookie
// middleware (see middleware.ts matcher) — no separate auth check needed
// here. One-time manual step: exchanges the OAuth code for a refresh
// token and displays it once for the operator to copy into env vars.
// Nothing is persisted server-side; this route never sees repeat traffic
// once the token is copied over.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`<p>Google returned an error: ${error}</p>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!code) {
    return new NextResponse("<p>Missing authorization code.</p>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new NextResponse("<p>GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.</p>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const redirectUri = `${origin}/api/internal/google-callback`;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `<p>No refresh token was returned. This usually means the account was already authorized before without being disconnected — go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account permissions</a>, remove access for this app, then try connecting again.</p>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new NextResponse(
      `<!doctype html><html><body style="font-family: system-ui; max-width: 640px; margin: 4rem auto; line-height: 1.6;">
        <h1>Connected</h1>
        <p>Copy this value into <code>GOOGLE_REFRESH_TOKEN</code> — both your local <code>.env.local</code> and the Vercel production environment variables — then redeploy.</p>
        <textarea readonly style="width: 100%; height: 4rem; font-family: monospace; padding: 0.5rem;">${tokens.refresh_token}</textarea>
        <p style="color: #666; font-size: 0.9rem;">This page won't show this value again — if you lose it, just reconnect from the Google connection page to get a new one.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.error("Google OAuth token exchange failed:", err);
    return new NextResponse("<p>Failed to exchange the authorization code — check the server logs.</p>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
