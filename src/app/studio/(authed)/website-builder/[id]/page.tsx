import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { WebsiteBriefPanel } from "@/components/platform/website-brief-panel";
import { Eyebrow } from "@/components/eyebrow";
import type { WebsiteBrief, WebsiteDiscovery } from "@/lib/website-brief";

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
    .select("id, stage, discovery, brief, brief_generated_at, client_id, clients(business_name)")
    .eq("id", id)
    .eq("org_id", membership.orgId)
    .single();

  if (!project) notFound();

  const clientName = (project as unknown as { clients: { business_name: string } | null }).clients?.business_name ?? "Untitled project";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/studio/website-builder" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Website Builder
      </Link>
      <Eyebrow className="mt-4">Website Project</Eyebrow>
      <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">{clientName}</h1>

      <div className="mt-8">
        <WebsiteBriefPanel
          projectId={project.id}
          brief={project.brief as WebsiteBrief | null}
          briefGeneratedAt={project.brief_generated_at}
          discovery={project.discovery as WebsiteDiscovery | null}
        />
      </div>
    </div>
  );
}
