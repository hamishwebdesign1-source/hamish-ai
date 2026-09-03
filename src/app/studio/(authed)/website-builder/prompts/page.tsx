import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Eyebrow } from "@/components/eyebrow";
import { PromptLibraryBrowser, type PromptLibraryPrefill } from "@/components/platform/prompt-library-browser";
import type { WebsiteBrief, WebsiteDiscovery } from "@/lib/website-brief";

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
export const metadata: Metadata = { title: "Prompt library | Studio" };

// AI Website Creation Guide, WB6 — the "make it better" prompt library
// (plan doc §14). Browseable standalone (no AI call, no project needed)
// via the Website Builder landing page, or opened with ?project=<id>
// from a real project so its known tokens — business name, location,
// brand colours, real sitemap page names — pre-fill instead of staying
// blank. Session-scoped client throughout, same as every other Studio
// page this session, so RLS enforces the org boundary independently of
// the .eq() below getting it right.
export default async function PromptLibraryPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project: projectId } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  let prefill: PromptLibraryPrefill = {};
  if (projectId) {
    const { data: project } = await supabase
      .from("website_projects")
      .select("discovery, brief")
      .eq("id", projectId)
      .eq("org_id", membership.orgId)
      .single();
    if (project) {
      const discovery = project.discovery as WebsiteDiscovery | null;
      const brief = project.brief as WebsiteBrief | null;
      prefill = {
        businessName: discovery?.businessName || undefined,
        location: discovery?.location || undefined,
        brandColours: discovery?.designColours || undefined,
        pageNames: brief?.sitemap?.map((s) => s.page),
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={projectId ? `/studio/website-builder/${projectId}` : "/studio/website-builder"}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> {projectId ? "Back to project" : "Website Builder"}
      </Link>
      <Eyebrow className="mt-4">Prompt library</Eyebrow>
      <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">Make it better</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Ready-to-use prompts for the common refinement asks — tightening copy, fixing spacing, improving SEO, running a QA pass before
        you show a client. Fill in the blanks and paste straight into your AI coding tool.
      </p>

      <div className="mt-8">
        <PromptLibraryBrowser prefill={prefill} />
      </div>
    </div>
  );
}
