import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/eyebrow";
import { AI_CODING_TOOLS } from "@/lib/ai-coding-tools";

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  brief: "Brief ready",
  tool: "Tool chosen",
  build: "Building",
  qa: "QA",
  launched: "Launched",
};

// AI Website Creation Guide, WB1 — the landing page for the whole
// capability. HamishAI does not build or host websites here (see the
// positioning note on the wizard/brief pages) — this page explains that
// plainly before anyone creates a project, not after.
export default async function WebsiteBuilderPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — website_projects_select_own_org RLS
  // (schema-rls-website-projects.sql) enforces the same org boundary
  // independently of this .eq() getting it right.
  const { data: projects } = await supabase
    .from("website_projects")
    .select("id, stage, created_at, client_id, clients(business_name)")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <Eyebrow>Website Builder</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">Build professional websites with AI</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        HamishAI doesn&apos;t build or host websites — it gives you the complete system, brief, and step-by-step AI
        instructions to build and manage professional websites yourself, using the world&apos;s leading agentic
        coding tools: Claude Code, Codex, and Cursor. You stay in charge of the build; we make you dramatically more
        capable of running it.
      </p>

      <div className="mt-8">
        <Link
          href="/studio/website-builder/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <Plus className="size-4" /> Create Website Project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="mt-8 space-y-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/studio/website-builder/${p.id}`}>
              <Card className="transition-colors hover:border-accent/40">
                <CardContent className="flex items-center justify-between gap-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Globe className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {(p as unknown as { clients: { business_name: string } | null }).clients?.business_name ?? "Untitled project"}
                      </p>
                      <p className="text-xs text-muted-foreground">Started {new Date(p.created_at).toLocaleDateString("en-GB")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{STAGE_LABELS[p.stage] ?? p.stage}</Badge>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
          <Globe className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No website projects yet — create one for a client to get started.
          </p>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-6">
        <p className="text-xs font-semibold text-muted-foreground">AI coding tool guides</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Not sure what working with these tools actually looks like day to day? Read a guide any time — you don&apos;t need a project started first.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.values(AI_CODING_TOOLS).map((tool) => (
            <Link key={tool.id} href={`/studio/website-builder/guides/${tool.id}`}>
              <Card className="transition-colors hover:border-accent/40">
                <CardContent className="flex items-center gap-2 py-3">
                  <BookOpen className="size-3.5 shrink-0 text-accent" />
                  <p className="text-xs font-medium">{tool.name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-xs font-semibold text-muted-foreground">Prompt library</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ready-to-use prompts for common refinement asks — tightening copy, fixing spacing, improving SEO, running a QA pass.
        </p>
        <Link href="/studio/website-builder/prompts" className="mt-3 block">
          <Card className="transition-colors hover:border-accent/40">
            <CardContent className="flex items-center gap-2 py-3">
              <Sparkles className="size-3.5 shrink-0 text-accent" />
              <p className="text-xs font-medium">Browse the prompt library</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
