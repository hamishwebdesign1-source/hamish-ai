import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { WebsiteBriefPanel } from "@/components/platform/website-brief-panel";
import { ToolRecommendationPanel } from "@/components/platform/tool-recommendation-panel";
import { BuildPhasePanel } from "@/components/platform/build-phase-panel";
import { LaunchPanel } from "@/components/platform/launch-panel";
import { ProjectStageTracker } from "@/components/platform/project-stage-tracker";
import { TroubleshootingComposer } from "@/components/platform/troubleshooting-composer";
import { WebsiteProjectFilesPanel, type ProjectFile } from "@/components/platform/website-project-files-panel";
import { WebsiteProjectAssigneeControl } from "@/components/platform/website-project-assignee-control";
import { DeleteWebsiteProjectControl } from "@/components/platform/delete-website-project-control";
import { listTeamMembers } from "@/lib/team-members";
import { Eyebrow } from "@/components/eyebrow";
import type { WebsiteBrief, WebsiteDiscovery } from "@/lib/website-brief";
import type { BuildPhase } from "@/lib/website-build-phases";
import type { ToolId, ToolQuizAnswers } from "@/lib/ai-coding-tools";
import type { TroubleshootingEntry } from "@/lib/website-troubleshooting";
import { getSignedFileUrl } from "@/lib/website-project-files";

// AI Website Creation Guide, WB3 — §16's "where the client/agency is"
// tracker, kept to the same 6 real stages the rest of the pipeline
// already tracks on website_projects.stage — not an illustrative
// 7-stage example, since inventing extra stages this project doesn't
// actually distinguish would be a tracker that lies. Moved from
// ProjectStageTracker's own hardcoded STAGES constant to a local one
// here (Projects Kanban Command Centre, Phase A — ProjectStageTracker
// now takes a `stages` prop so it can also render the projects table's
// own, unrelated 5-stage pipeline).
const WEBSITE_PROJECT_STAGES: { id: string; label: string }[] = [
  { id: "discovery", label: "Discovery" },
  { id: "brief", label: "Brief" },
  { id: "tool", label: "Tool" },
  { id: "build", label: "Build" },
  { id: "qa", label: "QA" },
  { id: "launched", label: "Launch" },
];

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
// Real per-project title (the client's actual business name, same field
// the page body reads below) rather than a generic fallback — genuinely
// useful here, since this is exactly the page an agency keeps several
// tabs of open at once, one per client build. A second, minimal query
// (just clients.business_name, not the full project fetch the page body
// does) rather than sharing one read — generateMetadata and the page
// component aren't guaranteed the same request-memoized client here, and
// this select is cheap enough that duplicating it beats the complexity
// of wiring a shared cache() just for a title.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return { title: "Website project | Studio" };

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return { title: "Website project | Studio" };

  const { data: project } = await supabase
    .from("website_projects")
    .select("clients(business_name)")
    .eq("id", id)
    .eq("org_id", membership.orgId)
    .single();

  const clientName = (project as unknown as { clients: { business_name: string } | null } | null)?.clients?.business_name;
  return { title: clientName ? `${clientName} | Studio` : "Website project | Studio" };
}

export default async function WebsiteProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — website_projects_select_own_org RLS enforces
  // the same org boundary independently of this .eq() getting it right.
  const [{ data: project }, teamMembers] = await Promise.all([
    supabase
      .from("website_projects")
      .select(
        "id, stage, discovery, brief, brief_generated_at, client_id, tool_quiz_answers, recommended_tool, build_phases, current_phase_index, live_url, analytics_connected, troubleshooting_log, assigned_to, clients(business_name)"
      )
      .eq("id", id)
      .eq("org_id", membership.orgId)
      .single(),
    // Studio big-ticket ("team collaboration") — same session-scoped
    // read as every other page that added assignment this session.
    listTeamMembers(supabase, membership.orgId),
  ]);

  if (!project) notFound();

  const clientName = (project as unknown as { clients: { business_name: string } | null }).clients?.business_name ?? "Untitled project";
  const buildPhases = project.build_phases as BuildPhase[] | null;
  const allPhasesComplete = Boolean(buildPhases && project.current_phase_index >= buildPhases.length);

  // website_project_files_select_own_org RLS (schema-rls-website-project-files.sql)
  // enforces the org boundary on this read the same way every other
  // table here does — signed URLs themselves are generated via the
  // admin client (getSignedFileUrl), same as getSignedVideoUrl(), since
  // that always needs storage-admin access regardless of caller.
  const { data: fileRows } = await supabase
    .from("website_project_files")
    .select("id, storage_path, file_name, content_type, size_bytes, kind, created_at")
    .eq("website_project_id", project.id)
    .order("created_at", { ascending: true });
  const files: ProjectFile[] = await Promise.all(
    (fileRows ?? []).map(async (f) => ({ ...f, kind: f.kind as ProjectFile["kind"], signedUrl: await getSignedFileUrl(f.storage_path) }))
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/studio/website-builder" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Website Builder
      </Link>
      <Eyebrow className="mt-4">Website Project</Eyebrow>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">{clientName}</h1>
        <div className="flex items-center gap-3">
          <WebsiteProjectAssigneeControl projectId={project.id} initialAssignedTo={project.assigned_to} teamMembers={teamMembers} />
          <DeleteWebsiteProjectControl projectId={project.id} />
        </div>
      </div>
      <div className="mt-4">
        <ProjectStageTracker stage={project.stage} stages={WEBSITE_PROJECT_STAGES} />
      </div>

      <div className="mt-8">
        <WebsiteProjectFilesPanel projectId={project.id} files={files} />
      </div>

      <div className="mt-8">
        <WebsiteBriefPanel
          projectId={project.id}
          brief={project.brief as WebsiteBrief | null}
          briefGeneratedAt={project.brief_generated_at}
          discovery={project.discovery as WebsiteDiscovery | null}
        />
      </div>

      {/* Progressive reveal, matching the brief's own pipeline (§18 —
          always answer "what do I do next") — the tool quiz and build
          phases only appear once there's a real brief to build from. */}
      {project.brief && (
        <div className="mt-8">
          <ToolRecommendationPanel
            projectId={project.id}
            initialAnswers={project.tool_quiz_answers as ToolQuizAnswers | null}
            initialRecommendedTool={project.recommended_tool as ToolId | null}
          />
        </div>
      )}

      {project.brief && project.recommended_tool && (
        <div className="mt-8">
          <BuildPhasePanel
            projectId={project.id}
            recommendedTool={project.recommended_tool as ToolId}
            buildPhases={buildPhases}
            currentPhaseIndex={project.current_phase_index}
          />
        </div>
      )}

      {project.brief && project.recommended_tool && (
        <div className="mt-8 space-y-3">
          <TroubleshootingComposer projectId={project.id} initialLog={(project.troubleshooting_log as TroubleshootingEntry[] | null) ?? []} />
          <Link
            href={`/studio/website-builder/prompts?project=${project.id}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent"
          >
            <Sparkles className="size-3.5" /> Browse the prompt library for this project
          </Link>
        </div>
      )}

      {buildPhases && (
        <div className="mt-8">
          <LaunchPanel
            projectId={project.id}
            stage={project.stage}
            liveUrl={project.live_url}
            analyticsConnected={project.analytics_connected}
            allPhasesComplete={allPhasesComplete}
          />
        </div>
      )}
    </div>
  );
}
