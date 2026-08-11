import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, History, X, Users } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { rejectContentIdea } from "@/app/admin/actions";
import { contentIdeaStatusMeta } from "@/lib/content-idea-meta";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentIdeaResearchButton } from "@/components/admin/content-idea-research-button";
import { ContentScriptPanel, type ScriptRow } from "@/components/admin/content-script-panel";

// Content Factory MVP Phase A+B (docs/content-factory-plan.md) — the
// idea/research/script workspace, same single-stage-aware-page shape as
// leads/[id]/page.tsx. This page grows new sections (ViewMax job status,
// Human Approval) as later build phases land — see the plan doc's Phase
// C/D sequencing.
export default async function ContentIdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const [{ data: idea }, { data: auditRows }, { data: scriptRows }] = await Promise.all([
    supabase.from("content_ideas").select("*").eq("id", id).single(),
    supabase
      .from("audit_log")
      .select("id, action, created_at, metadata")
      .eq("target_type", "content_idea")
      .eq("target_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_scripts")
      .select("id, style, status, hook, beats, scene_breakdown, score, score_rationale, video_prompt, prompt_generated_at, edited, created_at")
      .eq("idea_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!idea) notFound();

  const scripts = (scriptRows ?? []) as ScriptRow[];

  const audit = auditRows ?? [];
  const statusMeta = contentIdeaStatusMeta[idea.status as keyof typeof contentIdeaStatusMeta];

  return (
    <div>
      <Link href="/admin/content-factory" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" />
        Back to Content Factory
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title">{idea.title}</h1>
            {idea.source === "ai" && (
              <Badge variant="ai" className="gap-1">
                <Sparkles className="size-3" />
                AI-discovered
              </Badge>
            )}
          </div>
          <p className="text-page-subtitle mt-1">{[idea.topic, idea.platform_target].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={statusMeta?.variant ?? "secondary"}>{statusMeta?.label ?? idea.status}</Badge>
          {idea.score != null && (
            <div className="flex items-center gap-0.5" title={`Score: ${idea.score}/5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`size-1.5 rounded-full ${n <= idea.score ? "bg-accent" : "bg-border"}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <p className="text-section-title">Concept</p>
            <Card className="mt-3">
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm">{idea.concept}</p>

                {idea.status === "rejected" && idea.rejected_reason && (
                  <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">{idea.rejected_reason}</p>
                )}

                {idea.status !== "rejected" && (
                  <form action={rejectContentIdea.bind(null, idea.id)} className="flex items-start gap-1.5 border-t border-border pt-4">
                    <Textarea name="reason" placeholder="Reason for rejecting (optional)…" rows={2} className="max-w-96 text-xs" />
                    <Button type="submit" variant="ghost" size="xs" className="gap-1 text-muted-foreground hover:text-destructive">
                      <X className="size-3" />
                      Reject
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <p className="text-section-title">AI Research</p>
            <div className="mt-3">
              <ContentIdeaResearchButton
                ideaId={idea.id}
                initialResearch={idea.research ?? null}
                initialScore={idea.score ?? null}
                initialBreakdown={idea.score_breakdown ?? null}
                initialGeneratedAt={idea.research_generated_at ?? null}
                defaultExpanded
              />
            </div>
          </section>

          {scripts.length > 0 && (
            <section>
              <p className="text-section-title">Script</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                AI writes 3 variants and picks the strongest — you can override which one&apos;s used, or hand-edit it, at any point.
              </p>
              <div className="mt-3">
                <ContentScriptPanel ideaId={idea.id} scripts={scripts} />
              </div>
            </section>
          )}

          <section>
            <p className="flex items-center gap-1.5 text-section-title">
              <History className="size-4" />
              Timeline
            </p>
            {audit.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 border-l border-border pl-3">
                {audit.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span>{describeContentAuditEntry(entry)}</span> <span className="text-xs text-muted-foreground">— {timeAgo(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(idea.created_at).toLocaleDateString("en-GB")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="capitalize">{idea.source}</span>
              </div>
              {idea.research_generated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Researched</span>
                  <span>{timeAgo(idea.research_generated_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {idea.discovery_source && (
            <Card className="border-[color-mix(in_oklch,var(--gradient-violet),transparent_75%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Users className="size-3.5" />
                  Why AI suggested this
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {(idea.discovery_source as { why_suggested?: string }).why_suggested}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function describeContentAuditEntry(entry: { action: string; metadata: Record<string, unknown> | null }): string {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case "content.idea_created":
      return "Idea added manually";
    case "content.idea_discovered":
      return `AI discovered this idea — ${meta.why_suggested ?? "weekly trend search"}`;
    case "content.idea_researched":
      return `AI researched — scored ${meta.score}/5${meta.rejected ? " (auto-rejected)" : ""}`;
    case "content.idea_rejected":
      return `Rejected${meta.reason ? ` — ${meta.reason}` : ""}`;
    case "content.scripts_generated":
      return `AI wrote 3 script variants — auto-selected "${meta.selected_style ?? "?"}" (${meta.selected_score ?? "?"}/10)`;
    case "content.script_selected":
      return meta.edited ? "Script hand-edited" : `Script switched to "${meta.style ?? "?"}"${meta.manual ? " (manual)" : ""}`;
    case "content.video_prompt_generated":
      return `AI wrote the ViewMax prompt — ${meta.duration_s ?? "?"}s`;
    default:
      return entry.action;
  }
}
