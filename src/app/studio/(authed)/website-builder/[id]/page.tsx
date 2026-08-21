import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { WebsiteBriefPanel } from "@/components/platform/website-brief-panel";
import { ToolRecommendationPanel } from "@/components/platform/tool-recommendation-panel";
import { BuildPhasePanel } from "@/components/platform/build-phase-panel";
import { LaunchPanel } from "@/components/platform/launch-panel";
import { ProjectStageTracker } from "@/components/platform/project-stage-tracker";
import { TroubleshootingComposer } from "@/components/platform/troubleshooting-composer";
import { Eyebrow } from "@/components/eyebrow";
import type { WebsiteBrief, WebsiteDiscovery } from "@/lib/website-brief";
import type { BuildPhase } from "@/lib/website-build-phases";
import type { ToolId, ToolQuizAnswers } from "@/lib/ai-coding-tools";
import type { TroubleshootingEntry } from "@/lib/website-troubleshooting";

export default async function WebsiteProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — website_projects_select_own_org RLS enforces
  // the same org boundary independently of this .eq() getting it right.
  const { data: project } = await supabase
    .from("website_projects")
    .select(
      "id, stage, discovery, brief, brief_generated_at, client_id, tool_quiz_answers, recommended_tool, build_phases, current_phase_index, live_url, analytics_connected, troubleshooting_log, clients(business_name)"
    )
    .eq("id", id)
    .eq("org_id", membership.orgId)
    .single();

  if (!project) notFound();

  const clientName = (project as unknown as { clients: { business_name: string } | null }).clients?.business_name ?? "Untitled project";
  const buildPhases = project.build_phases as BuildPhase[] | null;
  const allPhasesComplete = Boolean(buildPhases && project.current_phase_index >= buildPhases.length);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/studio/website-builder" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Website Builder
      </Link>
      <Eyebrow className="mt-4">Website Project</Eyebrow>
      <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">{clientName}</h1>
      <div className="mt-4">
        <ProjectStageTracker stage={project.stage} />
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
        <div className="mt-8">
          <TroubleshootingComposer projectId={project.id} initialLog={(project.troubleshooting_log as TroubleshootingEntry[] | null) ?? []} />
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
