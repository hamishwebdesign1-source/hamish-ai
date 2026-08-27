"use server";

import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";

export type StudioSearchResult = {
  prospects: { id: string; business_name: string; status: string }[];
  clients: { id: string; business_name: string }[];
  // Real-improvement pass — the palette's search used to stop at
  // prospects/clients even though Knowledge, Campaigns, Projects, and
  // Requests are all real, named (or real-enough-to-match-on) entities
  // in the product. requests has no org_id column of its own (only
  // client_id, schema-internal-ops.sql) — scoped the same way
  // weekly-digest.ts already scopes a query through clients elsewhere,
  // a nested !inner filter, not a second round trip.
  knowledgeBase: { id: string; title: string }[];
  campaigns: { id: string; name: string; status: string }[];
  projects: { id: string; name: string; status: string }[];
  requests: { id: string; raw_text: string; status: string }[];
};

const EMPTY: StudioSearchResult = { prospects: [], clients: [], knowledgeBase: [], campaigns: [], projects: [], requests: [] };

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
// None of the six entity types here has a per-record detail route yet
// (every list page renders everything server-side, no /studio/clients/[id]
// or equivalent), so a match links to the list it lives on rather than
// the record itself — still real: it tells you the name exists and which
// list to find it in. Deep-linking to the exact row is a natural
// follow-up once those routes (or a URL-driven highlight) exist.
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

  const [{ data: prospects }, { data: clients }, { data: knowledgeBase }, { data: campaigns }, { data: projects }, { data: requests }] =
    await Promise.all([
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
      supabase.from("knowledge_base").select("id, title").eq("org_id", membership.orgId).ilike("title", `%${trimmed}%`).limit(5),
      supabase.from("campaigns").select("id, name, status").eq("org_id", membership.orgId).ilike("name", `%${trimmed}%`).limit(5),
      supabase.from("projects").select("id, name, status").eq("org_id", membership.orgId).ilike("name", `%${trimmed}%`).limit(5),
      supabase
        .from("requests")
        .select("id, raw_text, status, clients!inner(org_id)")
        .eq("clients.org_id", membership.orgId)
        .ilike("raw_text", `%${trimmed}%`)
        .limit(5),
    ]);

  return {
    prospects: prospects ?? [],
    clients: clients ?? [],
    knowledgeBase: knowledgeBase ?? [],
    campaigns: campaigns ?? [],
    projects: projects ?? [],
    // Strips the joined clients row back off — it was only ever there to
    // scope the filter, never part of the shape callers should see.
    requests: (requests ?? []).map((r) => ({ id: r.id, raw_text: r.raw_text, status: r.status })),
  };
}
