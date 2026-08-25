"use server";

import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";

export type StudioSearchResult = {
  prospects: { id: string; business_name: string; status: string }[];
  clients: { id: string; business_name: string }[];
};

const EMPTY: StudioSearchResult = { prospects: [], clients: [] };

// Studio's version of the admin command palette's search-as-you-type
// (src/app/api/internal/command-search/route.ts) — a Server Action here
// instead of a REST route, since every other Studio (authed) page already
// talks to the database through its own actions.ts, not an API endpoint.
// A session-scoped client (not getSupabaseAdmin(), which the admin route
// uses because HamishAI's own internal tenant needs no org filter) means
// RLS — prospects_select_own_org / clients_select_own_org — is what
// actually keeps one agency's search from ever touching another's rows,
// the same trust boundary requireOrgId() documents in prospects/actions.ts.
//
// Neither prospects nor clients has a per-record detail route yet (both
// list pages render everything server-side, no /studio/clients/[id]), so
// a match links to the list it lives on rather than the record itself —
// still real: it tells you the name exists and which list to find it in.
// Deep-linking to the exact row is a natural follow-up once those routes
// (or a URL-driven highlight) exist.
export async function searchStudio(query: string): Promise<StudioSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return EMPTY;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return EMPTY;

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return EMPTY;

  const [{ data: prospects }, { data: clients }] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, business_name, status")
      .eq("org_id", membership.orgId)
      .ilike("business_name", `%${trimmed}%`)
      .limit(5),
    supabase
      .from("clients")
      .select("id, business_name")
      .eq("org_id", membership.orgId)
      .ilike("business_name", `%${trimmed}%`)
      .limit(5),
  ]);

  return { prospects: prospects ?? [], clients: clients ?? [] };
}
