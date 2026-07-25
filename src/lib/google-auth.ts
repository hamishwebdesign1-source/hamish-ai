import { google } from "googleapis";

// Shared OAuth2 client for Gmail + Calendar server-side access, authorized
// once via scripts/google-oauth-setup.mjs and refreshed automatically from
// then on using the stored refresh token — no interactive login at runtime.
export function getGoogleAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
