import { redirect } from "next/navigation";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
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
  } = await getUserWithRetry(supabase);
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const [{ data: requests }, { data: projects }, { data: websiteProjects }, { data: org }] = await Promise.all([
    supabase
      .from("requests")
      .select(
        "id, created_at, client_id, raw_text, status, category, complexity, suggested_approach, covered_by_maintenance, coverage_reasoning, draft_response, priority, missing_info, responded_at, website_project_id, clients!inner(business_name, org_id)"
      )
      .eq("clients.org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, client_id, name, status").eq("org_id", membership.orgId).eq("status", "active"),
    // AI Website Creation Guide, WB7 — client_id + stage is all
    // RequestsPanel needs to offer "turn this into an AI task" per
    // request; turnRequestIntoWebsiteTask() itself re-verifies the
    // client match and brief/tool readiness server-side.
    supabase.from("website_projects").select("id, client_id, stage").eq("org_id", membership.orgId),
    // Studio big-ticket ("two-way client request threads") — gates the
    // new "Send reply" button: sendRequestReply() (actions.ts) itself
    // re-checks this server-side too, this is just so the button doesn't
    // render promising something that would immediately fail.
    supabase.from("organisations").select("brand").eq("id", membership.orgId).single(),
  ]);

  const canSendReply = Boolean((org?.brand as { replyToEmail?: string } | null)?.replyToEmail);

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } =
    requestIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, request_id, title, description, acceptance_criteria, status, project_id")
          .in("request_id", requestIds)
      : { data: [] };

  return <RequestsPanel requests={requests ?? []} tasks={tasks ?? []} projects={projects ?? []} websiteProjects={websiteProjects ?? []} canSendReply={canSendReply} />;
}
