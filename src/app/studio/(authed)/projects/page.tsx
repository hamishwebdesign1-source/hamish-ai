import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { listTeamMembers } from "@/lib/team-members";
import { ProjectsPanel } from "@/components/platform/projects-panel";

// Same split as every other /studio page — data assembly here, actions in
// projects/actions.ts, called from ProjectsPanel below.
//
// Session-scoped client throughout — RLS (projects_select_own_org,
// schema-rls-projects-org-staff.sql) enforces the same org boundary
// independently of these .eq()s getting it right.
export default async function StudioProjectsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const [{ data: clients }, { data: projects }, teamMembers] = await Promise.all([
    supabase.from("clients").select("id, business_name").eq("org_id", membership.orgId).order("business_name"),
    supabase
      .from("projects")
      .select("id, client_id, name, target_date, status, created_at, assigned_to")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    // Studio big-ticket ("team collaboration") — same session-scoped
    // read as requests/page.tsx's own (memberships_select_own RLS,
    // schema-organisations.sql).
    listTeamMembers(supabase, membership.orgId),
  ]);

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: tasks } = projectIds.length
    ? await supabase.from("tasks").select("id, project_id, status").in("project_id", projectIds)
    : { data: [] };

  return (
    <ProjectsPanel
      clients={clients ?? []}
      projects={projects ?? []}
      tasks={tasks ?? []}
      teamMembers={teamMembers}
      currentUserEmail={user.email}
    />
  );
}
