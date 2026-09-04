import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus, ArrowRight, BookOpen, Sparkles, Clock } from "lucide-react";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudioPageHeader } from "@/components/platform/studio-page-header";
import { AI_CODING_TOOLS } from "@/lib/ai-coding-tools";
import { daysSince } from "@/lib/lead-meta";

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
export const metadata: Metadata = { title: "Website Builder | Studio" };

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  brief: "Brief ready",
  tool: "Tool chosen",
  build: "Building",
  qa: "QA",
  launched: "Launched",
};

// Studio improvement — the project list was flat and chronological, so
// "what's actually stuck in Build right now" meant scrolling the whole
// list checking every badge. Same STAGE_LABELS keys, just used as a real
// grouping order (pipeline order, not insertion order) instead of only a
// per-row label. "" is the fallback bucket for a stage value that's
// since fallen out of STAGE_LABELS (a legacy row, or a future value this
// page hasn't been taught yet) — still shown, same "don't silently drop
// real data" rule as everywhere else in this app, just grouped last
// under its own raw value rather than a made-up label.
const STAGE_ORDER = [...Object.keys(STAGE_LABELS), ""];

// Studio improvement — leads, campaigns, and regular projects (due-soon/
// overdue) all already flag something that's sat too long with no forward
// progress; website builder projects were the one project-like list left
// without it. 14 days, not the 30 lead-staleness uses (isStaleLead,
// lead-meta.ts) — a lead is pre-contact discovery, less time-sensitive
// than an active build; 14 matches campaigns-panel.tsx's own staleness
// threshold instead, the closer precedent for "active work, should be
// moving."
const STALE_PROJECT_DAYS = 14;

type WebsiteProjectRow = {
  id: string;
  stage: string;
  created_at: string;
  assigned_to: string | null;
  clients: { business_name: string } | null;
};

function ProjectRow({ project }: { project: WebsiteProjectRow }) {
  const daysOld = Math.floor(daysSince(project.created_at));
  const isStale = project.stage !== "launched" && daysOld >= STALE_PROJECT_DAYS;

  return (
    <Link href={`/studio/website-builder/${project.id}`}>
      <Card className="transition-colors hover:border-accent/40">
        <CardContent className="flex items-center justify-between gap-3 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Globe className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{project.clients?.business_name ?? "Untitled project"}</p>
              <p className="text-xs text-muted-foreground">Started {new Date(project.created_at).toLocaleDateString("en-GB")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Studio big-ticket ("team collaboration") — read-only here
                (this row is a plain server-rendered <Link>, not an
                interactive card); the assignee <select> itself lives on
                the project's own detail page
                (WebsiteProjectAssigneeControl). */}
            {project.assigned_to && (
              <span className="font-mono text-[11px] text-muted-foreground" title={`Assigned to ${project.assigned_to}`}>
                {project.assigned_to.split("@")[0]}
              </span>
            )}
            {isStale && (
              <Badge variant="warning" className="gap-1">
                <Clock className="size-3" /> {daysOld}d
              </Badge>
            )}
            {!STAGE_LABELS[project.stage] && <Badge variant="secondary">{project.stage}</Badge>}
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
    .select("id, stage, created_at, client_id, assigned_to, clients(business_name)")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      {/* Studio Design Audit, Tier 1 #4 — eyebrow inconsistency resolved
          by keeping the eyebrow, not dropping it: every adopting page now
          gets one (its real nav-section name, via StudioPageHeader),
          instead of leaving Website Builder as the one page with an
          unexplained one-off. */}
      <StudioPageHeader
        eyebrow="Build"
        title="Build professional websites with AI"
        description="HamishAI doesn't build or host websites — it gives you the complete system, brief, and step-by-step AI instructions to build and manage professional websites yourself, using the world's leading agentic coding tools: Claude Code, Codex, and Cursor. You stay in charge of the build; we make you dramatically more capable of running it."
        actions={
          // Studio Design Audit, Tier 1 #4 — was a hand-rolled <Link>
          // styled as a button; now the established Button+render pattern
          // (see command-centre-section-cards.tsx), same icon/label/colour
          // intent kept. Post-build cleanup: moved into StudioPageHeader's
          // own `actions` slot (item #5) to match Analytics' range-
          // switcher/CSV-export controls instead of sitting outside it.
          <Button
            key="create-website-project"
            size="lg"
            className="gap-2 bg-accent px-4 font-semibold text-accent-foreground hover:bg-accent/90"
            render={<Link href="/studio/website-builder/new" />}
          >
            <Plus className="size-4" /> Create Website Project
          </Button>
        }
      />

      {projects && projects.length > 0 ? (
        <div className="mt-8 space-y-6">
          {STAGE_ORDER.map((stage) => {
            const stageProjects = (projects as unknown as WebsiteProjectRow[]).filter((p) =>
              stage === "" ? !STAGE_LABELS[p.stage] : p.stage === stage
            );
            if (stageProjects.length === 0) return null;
            return (
              <div key={stage || "other"}>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {stage === "" ? "Other" : STAGE_LABELS[stage]}
                  <span className="font-mono text-[11px] text-muted-foreground/70">({stageProjects.length})</span>
                </p>
                <div className="mt-2 space-y-2">
                  {stageProjects.map((p) => (
                    <ProjectRow key={p.id} project={p} />
                  ))}
                </div>
              </div>
            );
          })}
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
