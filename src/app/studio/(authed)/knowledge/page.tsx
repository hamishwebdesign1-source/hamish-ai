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
    supabase.from("clients").select("id, business_name").eq("org_id", membership.orgId).order("business_name"),
    supabase
      .from("knowledge_base")
      .select("id, client_id, title, content, created_at")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
  ]);

  return <KnowledgePanel clients={clients ?? []} entries={entries ?? []} />;
}
