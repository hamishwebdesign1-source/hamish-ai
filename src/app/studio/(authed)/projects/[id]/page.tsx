import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { listTeamMembers } from "@/lib/team-members";
import { Eyebrow } from "@/components/eyebrow";
import { ProjectStageTracker } from "@/components/platform/project-stage-tracker";
import { ProjectStageBadge } from "@/components/status-badges";
import { ProjectStageQuickChange } from "@/components/platform/project-stage-quick-change";
import { ProjectAssigneeControl } from "@/components/platform/project-assignee-control";
import { DeleteProjectControl } from "@/components/platform/delete-project-control";
import { ProjectTaskList } from "@/components/platform/project-task-list";
import { ProjectDeliverableList } from "@/components/platform/project-deliverable-list";
import { ProjectActivityTrail } from "@/components/platform/project-activity-trail";
import { PROJECT_STAGES } from "@/lib/project-stages";
import { formatDate, isOverdue, isDueSoon, dueDateNote } from "@/lib/project-dates";

// Projects Kanban Command Centre, Phase A — real per-client-tab title
// like website-builder/[id]/page.tsx's own generateMetadata, using the
// project's own name (its real identity here, since one client can have
// several projects — unlike a website project, one per client).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return { title: "Project | Studio" };

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return { title: "Project | Studio" };

  const { data: project } = await supabase.from("projects").select("name").eq("id", id).eq("org_id", membership.orgId).single();

  return { title: project?.name ? `${project.name} | Studio` : "Project | Studio" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — projects_select_own_org RLS
  // (schema-rls-projects-org-staff.sql) enforces the same org boundary
  // independently of this .eq() getting it right.
  const [{ data: project }, teamMembers] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage, status, target_date, assigned_to, client_id, clients(business_name)")
      .eq("id", id)
      .eq("org_id", membership.orgId)
      .single(),
    listTeamMembers(supabase, membership.orgId),
  ]);

  if (!project) notFound();

  const clientName = (project as unknown as { clients: { business_name: string } | null }).clients?.business_name ?? "Unknown client";

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("id, title, description, acceptance_criteria, status, request_id")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });
  const tasks = tasksData ?? [];

  const requestIds = tasks.map((t) => t.request_id).filter((v): v is string => Boolean(v));
  const { data: requestsData } = requestIds.length
    ? await supabase.from("requests").select("id, raw_text").in("id", requestIds)
    : { data: [] };
  const requestsById = new Map((requestsData ?? []).map((r) => [r.id, r]));

  // Projects Kanban Command Centre, Phase C1 -- deliverables_select_own_org
  // RLS (schema-deliverables.sql) enforces the same org boundary
  // independently of this .eq(), same shape as the tasks read above.
  const { data: deliverablesData } = await supabase
    .from("deliverables")
    .select("id, title, description, link_url, submitted_by, submitted_at")
    .eq("project_id", project.id)
    .order("submitted_at", { ascending: true });
  const deliverables = deliverablesData ?? [];

  // Read via the admin client, same as /admin/activity-log — audit_log
  // has no client-portal-facing RLS policy at all (org staff only), and
  // this file already runs entirely behind the org-membership check
  // above.
  const admin = getSupabaseAdmin();
  const { data: activityData } = admin
    ? await admin
        .from("audit_log")
        .select("id, created_at, actor, actor_type, action, metadata")
        .eq("target_type", "project")
        .eq("target_id", project.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const overdue = isOverdue(project.target_date, project.status);
  const dueSoon = isDueSoon(project.target_date, project.status);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/studio/projects" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Projects
      </Link>
      <Eyebrow className="mt-4">Project</Eyebrow>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold md:text-3xl">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{clientName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProjectStageQuickChange projectId={project.id} initialStage={project.stage} />
          <ProjectAssigneeControl projectId={project.id} initialAssignedTo={project.assigned_to} teamMembers={teamMembers} />
          <DeleteProjectControl projectId={project.id} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ProjectStageTracker stage={project.stage} stages={PROJECT_STAGES} />
        <ProjectStageBadge stage={project.stage} />
      </div>

      {project.target_date && (
        <p className={`mt-2 text-xs ${overdue ? "text-destructive" : dueSoon ? "text-warning" : "text-muted-foreground"}`}>
          Target date: {formatDate(project.target_date)}
          {project.status !== "done" && ` · ${dueDateNote(project.target_date)}`}
        </p>
      )}

      <div className="mt-8">
        <ProjectTaskList projectId={project.id} tasks={tasks} requestsById={requestsById} />
      </div>

      <div className="mt-8">
        <ProjectDeliverableList projectId={project.id} projectStage={project.stage} deliverables={deliverables} />
      </div>

      <div className="mt-8">
        <ProjectActivityTrail entries={activityData ?? []} />
      </div>
    </div>
  );
}
