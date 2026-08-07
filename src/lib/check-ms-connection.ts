import { getMsAccessToken } from "@/lib/ms-graph-auth";

// Microsoft equivalent of check-google-connection.ts — a stored refresh
// token can exist but be revoked/expired, so this makes the cheapest real
// Graph call (GET /me) to tell "configured" apart from "actually working",
// same reasoning as the Gmail connector's connection-status banner.
export async function checkMsConnection(): Promise<{ connected: true } | { connected: false; reason: string }> {
  const tokenResult = await getMsAccessToken();
  if ("error" in tokenResult) return { connected: false, reason: tokenResult.error };

  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
    });
    if (!res.ok) return { connected: false, reason: `Microsoft Graph rejected the request (${res.status}).` };
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return { connected: false, reason: message };
  }
}
