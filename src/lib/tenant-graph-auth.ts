import { getSupabaseAdmin } from "@/lib/supabase";

// Multi-tenant sibling of ms-graph-auth.ts. Three deliberate differences
// from that file, all following from "this is a paying tenant's own
// inbox, not Hamish's":
//
// 1. A separate Azure app registration (PLATFORM_MS_CLIENT_ID/SECRET),
//    requesting only Mail.Read + User.Read + offline_access — no write
//    scopes a tenant's consent screen has no business asking for.
// 2. The "common" token endpoint, not a fixed tenant id — this app
//    accepts both work/school and personal Microsoft accounts, so a
//    sole-trader tenant on a personal Outlook.com address isn't excluded.
// 3. One refresh token per org (email_connections), not a single env-var
//    row — see schema-email-connections.sql.
//
// See the published "Inbox Reply Detection" scoping note for the full
// plan this implements.

export const TENANT_GRAPH_SCOPES = ["offline_access", "User.Read", "Mail.Read"];

export function hasPlatformMsConfig(): boolean {
  return Boolean(process.env.PLATFORM_MS_CLIENT_ID && process.env.PLATFORM_MS_CLIENT_SECRET);
}

export async function getTenantGraphAccessToken(orgId: string): Promise<{ accessToken: string } | { error: string }> {
  const clientId = process.env.PLATFORM_MS_CLIENT_ID;
  const clientSecret = process.env.PLATFORM_MS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: "Inbox connections aren't configured yet — set PLATFORM_MS_CLIENT_ID and PLATFORM_MS_CLIENT_SECRET." };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: row } = await admin
    .from("email_connections")
    .select("refresh_token")
    .eq("org_id", orgId)
    .eq("provider", "microsoft")
    .maybeSingle();
  if (!row?.refresh_token) return { error: "No inbox connected for this organisation yet." };

  let res: Response;
  try {
    res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
        scope: TENANT_GRAPH_SCOPES.join(" "),
      }),
    });
  } catch (error) {
    console.error("Tenant Microsoft token refresh request failed:", error);
    return { error: "Failed to reach Microsoft's token endpoint." };
  }

  if (!res.ok) {
    console.error("Tenant Microsoft token refresh failed:", await res.text());
    return { error: "Failed to refresh the connected inbox's access token — try reconnecting from Settings." };
  }

  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token) return { error: "Microsoft's token endpoint didn't return an access token." };

  // Same rotation handling as ms-graph-auth.ts — persist the new refresh
  // token immediately or the connection silently breaks once the old
  // one's short grace period ends.
  if (json.refresh_token && json.refresh_token !== row.refresh_token) {
    const { error: updateError } = await admin
      .from("email_connections")
      .update({ refresh_token: json.refresh_token })
      .eq("org_id", orgId)
      .eq("provider", "microsoft");
    if (updateError) console.error("Failed to persist rotated tenant Microsoft refresh token:", updateError);
  }

  return { accessToken: json.access_token };
}
