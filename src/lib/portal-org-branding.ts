import type { SupabaseClient } from "@supabase/supabase-js";

export type PortalOrgBranding = { name: string; isInternal: boolean; accentColor: string | null };

const HAMISHAI_BRANDING: PortalOrgBranding = { name: "HamishAI", isInternal: true, accentColor: null };

// The single source of truth for "what does this client's portal call
// itself" — used everywhere the portal used to just hardcode "HamishAI"
// (the sidebar's "Ask HamishAI" nav item, the Ask/Help/Home pages, the
// AI copilot's own system prompt). Every caller passes the client row's
// own org_id; a null/missing org_id (shouldn't happen post-backfill, but
// defensive) falls back to HamishAI branding rather than showing a blank
// name.
//
// Reads via the session-scoped client — same
// organisations_select_via_client RLS policy
// (schema-rls-organisations-via-client.sql) the portal layout's own
// header branding already depends on, so this is only ever the caller's
// own client's org, never anyone else's.
export async function getPortalOrgBranding(supabase: SupabaseClient, orgId: string | null): Promise<PortalOrgBranding> {
  if (!orgId) return HAMISHAI_BRANDING;

  const { data: org } = await supabase.from("organisations").select("name, is_internal, brand").eq("id", orgId).single();
  if (!org || org.is_internal) return HAMISHAI_BRANDING;

  const brand = (org.brand ?? {}) as { accentColor?: string };
  return { name: org.name, isInternal: false, accentColor: brand.accentColor ?? null };
}
