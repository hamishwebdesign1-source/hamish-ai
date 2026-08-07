import { getSupabaseAdmin } from "@/lib/supabase";

// Microsoft Graph equivalent of google-auth.ts, with one deliberate
// structural difference: Microsoft's v2.0 token endpoint rotates the
// refresh token on every use (Google's stays static until revoked), so it
// can't live in a Vercel env var the way GOOGLE_REFRESH_TOKEN does —
// nothing at runtime can rewrite an env var. It's persisted in the
// ms_graph_tokens table instead (single row, id 'default') and updated
// every time a fresh access token is requested. See
// docs/teams-meeting-intelligence-plan.md section 3 for the schema.
//
// Requested up front, once, rather than scope-by-scope per phase — Phase 1
// only exercises Calendars.ReadWrite + User.Read, but asking for
// everything Phase 2/3 will eventually need in the same consent means
// Hamish never has to re-consent partway through the roadmap.
export const GRAPH_SCOPES = [
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
  "OnlineMeetings.ReadWrite",
  "OnlineMeetingTranscript.Read.All",
  "OnlineMeetingArtifact.Read.All",
  "Chat.Read",
];

export function hasMsGraphConfig(): boolean {
  return Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MS_TENANT_ID);
}

export async function getMsAccessToken(): Promise<{ accessToken: string } | { error: string }> {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID;
  if (!clientId || !clientSecret || !tenantId) {
    return { error: "Microsoft Graph is not configured — set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID." };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: row } = await supabase.from("ms_graph_tokens").select("refresh_token").eq("id", "default").single();
  if (!row?.refresh_token) {
    return { error: "Microsoft account isn't connected yet — visit /admin/ms-setup." };
  }

  let res: Response;
  try {
    res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
        scope: GRAPH_SCOPES.join(" "),
      }),
    });
  } catch (error) {
    console.error("Microsoft token refresh request failed:", error);
    return { error: "Failed to reach Microsoft's token endpoint." };
  }

  if (!res.ok) {
    console.error("Microsoft token refresh failed:", await res.text());
    return { error: "Failed to refresh the Microsoft access token — try reconnecting at /admin/ms-setup." };
  }

  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token) return { error: "Microsoft's token endpoint didn't return an access token." };

  // The rotation this whole module exists to handle: persist the new
  // refresh token immediately, or the connection silently breaks once the
  // old one's short grace period ends — the exact "worked yesterday, dead
  // today" failure mode already seen with the Gmail connector.
  if (json.refresh_token && json.refresh_token !== row.refresh_token) {
    const { error: updateError } = await supabase
      .from("ms_graph_tokens")
      .update({ refresh_token: json.refresh_token, updated_at: new Date().toISOString() })
      .eq("id", "default");
    if (updateError) console.error("Failed to persist rotated Microsoft refresh token:", updateError);
  }

  return { accessToken: json.access_token };
}
