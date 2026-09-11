import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Eyebrow } from "@/components/eyebrow";
import { BuildScriptView } from "@/components/platform/build-script-view";
import { AI_CODING_TOOLS, type ToolId } from "@/lib/ai-coding-tools";
import { BUILD_PHASE_ORDER, type BuildPhase } from "@/lib/website-build-phases";

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
// Same minimal, separate metadata query as [id]/page.tsx's own
// generateMetadata — not sharing a request-memoized client with the page
// body, same reasoning given there.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return { title: "Full build script | Studio" };

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return { title: "Full build script | Studio" };

  const { data: project } = await supabase.from("website_projects").select("clients(business_name)").eq("id", id).eq("org_id", membership.orgId).single();

  const clientName = (project as unknown as { clients: { business_name: string } | null } | null)?.clients?.business_name;
  return { title: clientName ? `Full build script — ${clientName} | Studio` : "Full build script | Studio" };
}

// Website Builder build-phase flow (BACKLOG.md, 2026-09-11), point 3 —
// the dedicated "get everything" route (DECISIONS.md's matching
// 2026-09-11 entry, Decision 3: a real page, not a modal or an in-place
// expand-all). Session-scoped client, same org-boundary pattern as
// every other Studio page — website_projects_select_own_org RLS
// enforces it independently of the .eq() below getting it right.
export default async function BuildScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: project } = await supabase
    .from("website_projects")
    .select("id, recommended_tool, build_phases, clients(business_name)")
    .eq("id", id)
    .eq("org_id", membership.orgId)
    .single();

  if (!project) notFound();

  const clientName = (project as unknown as { clients: { business_name: string } | null }).clients?.business_name ?? "Untitled project";
  const buildPhases = (project.build_phases as BuildPhase[] | null) ?? [];
  const tool = project.recommended_tool ? AI_CODING_TOOLS[project.recommended_tool as ToolId] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/studio/website-builder/${project.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to project
      </Link>
      <Eyebrow className="mt-4">Full build script</Eyebrow>
      <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">{clientName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {buildPhases.length} of {BUILD_PHASE_ORDER.length} phases written.
      </p>

      <div className="mt-6">
        <BuildScriptView projectId={project.id} tool={tool} phases={buildPhases} />
      </div>
    </div>
  );
}
