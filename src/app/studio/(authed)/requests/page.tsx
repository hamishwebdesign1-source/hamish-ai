import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { RequestsPanel } from "@/components/platform/requests-panel";

// Server-side data assembly only, same split as every other /studio page —
// actions live in requests/actions.ts, called from RequestsPanel below.
//
// Session-scoped client throughout — RLS (requests_select_own_org /
// tasks_select_own_org, schema-rls-requests-tasks-org-staff.sql) enforces
// the same org boundary independently of these .eq()s getting it right,
// same belt-and-braces convention as every other /studio read.
export default async function StudioRequestsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: requests } = await supabase
    .from("requests")
    .select(
      "id, created_at, client_id, raw_text, status, category, complexity, suggested_approach, covered_by_maintenance, coverage_reasoning, draft_response, priority, missing_info, responded_at, clients!inner(business_name, org_id)"
    )
    .eq("clients.org_id", membership.orgId)
    .order("created_at", { ascending: false });

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } =
    requestIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, request_id, title, description, acceptance_criteria, status")
          .in("request_id", requestIds)
      : { data: [] };

  return <RequestsPanel requests={requests ?? []} tasks={tasks ?? []} />;
}
