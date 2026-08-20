import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { KnowledgePanel } from "@/components/platform/knowledge-panel";

// Session-scoped client throughout — RLS (knowledge_base_select_own_org,
// schema-rls-knowledge-base-org-staff.sql) enforces the same org boundary
// independently of the .eq() below getting it right.
export default async function StudioKnowledgePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const [{ data: clients }, { data: entries }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, business_name, source_lead_id")
      .eq("org_id", membership.orgId)
      .order("business_name"),
    supabase
      .from("knowledge_base")
      .select("id, client_id, title, content, created_at")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
  ]);

  // Real, already-generated research from prospecting (research-lead.ts) —
  // reused here so a tenant isn't retyping facts about a business they've
  // already researched. Only business_summary/services are ever offered:
  // the rest of a prospect's research (strengths/weaknesses, sales angle,
  // conversion-probability band) is internal sales analysis written to
  // help the tenant win the deal, not something that belongs in a
  // customer-facing knowledge base grounding that same business's own
  // support chatbot.
  const sourceLeadIds = (clients ?? []).map((c) => c.source_lead_id).filter((id): id is string => Boolean(id));
  const { data: prospectsWithResearch } = sourceLeadIds.length
    ? await supabase.from("prospects").select("id, research").in("id", sourceLeadIds).not("research", "is", null)
    : { data: [] };

  const researchByClient: Record<string, { business_summary: string; services: string[] }> = {};
  for (const client of clients ?? []) {
    if (!client.source_lead_id) continue;
    const prospect = (prospectsWithResearch ?? []).find((p) => p.id === client.source_lead_id);
    const research = prospect?.research as { business_summary?: string; services?: string[] } | null | undefined;
    if (research?.business_summary) {
      researchByClient[client.id] = { business_summary: research.business_summary, services: research.services ?? [] };
    }
  }

  return <KnowledgePanel clients={clients ?? []} entries={entries ?? []} researchByClient={researchByClient} />;
}
