import { google } from "googleapis";
import { getGoogleAuthClient } from "@/lib/google-auth";

// getGoogleAuthClient() only checks that the env vars are *present* — a
// refresh token can be set but revoked/expired (exactly what happened
// 2026-08-06: every Gmail call started failing with "requires additional
// permissions, reconnect" despite GOOGLE_REFRESH_TOKEN being set), and that
// only surfaces once Google actually rejects a real call. This makes the
// cheapest real call available (users.getProfile) to tell "configured" apart
// from "actually working" — used to drive the connection-status banner on
// /admin/leads so a broken connector is visible before someone hits it
// lead-by-lead.
export async function checkGoogleConnection(): Promise<{ connected: true } | { connected: false; reason: string }> {
  const auth = getGoogleAuthClient();
  if (!auth) {
    return { connected: false, reason: "Not configured — no Google client ID, secret, or refresh token set." };
  }

  try {
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.getProfile({ userId: "me" });
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return { connected: false, reason: message };
  }
}
