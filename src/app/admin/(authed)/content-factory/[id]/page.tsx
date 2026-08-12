import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, History, X, Users, Clock, Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { rejectContentIdea, retryVideoSubmission } from "@/app/admin/actions";
import { contentIdeaStatusMeta } from "@/lib/content-idea-meta";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentIdeaResearchButton } from "@/components/admin/content-idea-research-button";
import { ContentScriptPanel, type ScriptRow } from "@/components/admin/content-script-panel";
import { ContentVideoApproval, ContentVideoDecided, type PlatformCopy } from "@/components/admin/content-video-approval";
import { getSignedVideoUrl } from "@/lib/content-video-storage";

// Content Factory MVP Phase A-D (docs/content-factory-plan.md) — the
// full idea/research/script/video/approval workspace, same single-
// stage-aware-page shape as leads/[id]/page.tsx.
// Same badge-vocabulary mapping approach as RESEARCH_JOB_META on
// leads/[id]/page.tsx — content_videos.status onto the existing Badge
// variants, so a new job-status table doesn't need a new visual language.
const VIDEO_STATUS_META: Record<string, { label: string; variant: "outline" | "warning" | "success" | "destructive"; icon: typeof Clock }> = {
  queued: { label: "Queued", variant: "outline", icon: Clock },
  submitted: { label: "Submitted to ViewMax", variant: "warning", icon: Loader2 },
  processing: { label: "Generating", variant: "warning", icon: Loader2 },
  succeeded: { label: "Ready for review", variant: "success", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  canceled: { label: "Canceled", variant: "destructive", icon: XCircle },
  needs_review: { label: "Needs review", variant: "warning", icon: AlertTriangle },
};

export default async function ContentIdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const [{ data: idea }, { data: auditRows }, { data: scriptRows }, { data: videoRows }] = await Promise.all([
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
    supabase
      .from("content_videos")
      .select(
        "id, status, viewmax_task_id, viewmax_model, poll_attempts, last_polled_at, error, created_at, storage_path, quality_flags, platform_copy, platform_copy_generated_at, approval_status, approved_at, rejection_reason"
      )
      .eq("idea_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (!idea) notFound();

  const scripts = (scriptRows ?? []) as ScriptRow[];
  const latestVideo = videoRows?.[0] ?? null;
  const videoUrl = latestVideo?.status === "succeeded" && latestVideo.storage_path ? await getSignedVideoUrl(latestVideo.storage_path) : null;

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

          {latestVideo && (
            <section>
              <p className="text-section-title">Video generation</p>
              <Card className="mt-3">
                <CardContent className="space-y-3 pt-6 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const meta = VIDEO_STATUS_META[latestVideo.status] ?? VIDEO_STATUS_META.queued;
                      const Icon = meta.icon;
                      const spinning = latestVideo.status === "submitted" || latestVideo.status === "processing";
                      return (
                        <Badge variant={meta.variant} className="gap-1">
                          <Icon className={`size-3 ${spinning ? "animate-spin" : ""}`} />
                          {meta.label}
                        </Badge>
                      );
                    })()}
                    {latestVideo.viewmax_model && <span className="text-muted-foreground">Model: {latestVideo.viewmax_model}</span>}
                    {latestVideo.poll_attempts > 0 && <span className="text-muted-foreground">Checked {latestVideo.poll_attempts}×</span>}
                    {latestVideo.last_polled_at && <span className="text-muted-foreground">Last checked {timeAgo(latestVideo.last_polled_at)}</span>}
                  </div>
                  {latestVideo.error && (
                    <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-warning">{latestVideo.error}</p>
                  )}
                  {(latestVideo.status === "failed" || latestVideo.status === "needs_review") && (
                    <form action={retryVideoSubmission.bind(null, idea.id)}>
                      <Button type="submit" variant="outline" size="xs" className="gap-1">
                        <RefreshCw className="size-3" />
                        Retry submission
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {latestVideo?.status === "succeeded" && (
            <section>
              <p className="text-section-title">Review</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Watch it, check the caption, then Approve, Regenerate, or Reject.</p>
              <div className="mt-3">
                {latestVideo.approval_status === "approved" ? (
                  <ContentVideoDecided status="approved" decidedAt={latestVideo.approved_at} />
                ) : latestVideo.approval_status === "rejected" ? (
                  <ContentVideoDecided status="rejected" reason={latestVideo.rejection_reason} />
                ) : (
                  <ContentVideoApproval
                    videoId={latestVideo.id}
                    ideaId={idea.id}
                    videoUrl={videoUrl}
                    qualityFlags={latestVideo.quality_flags}
                    platformCopy={latestVideo.platform_copy as PlatformCopy | null}
                    platformCopyGeneratedAt={latestVideo.platform_copy_generated_at}
                  />
                )}
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
    case "content.video_submitted":
      return `Submitted to ViewMax (${meta.model ?? "?"})`;
    case "content.video_completed":
      return "Video generation complete — ready for review";
    case "content.video_failed":
      return `Video generation failed${meta.stage ? ` (${meta.stage})` : ""}`;
    case "content.video_retry_requested":
      return meta.ok ? "Retry requested — resubmitted to ViewMax" : `Retry requested — failed again (${meta.reason ?? "unknown reason"})`;
    case "content.copy_generated":
      return `AI wrote the title/caption/hashtags — "${meta.title ?? "?"}"`;
    case "content.video_approved":
      return "Video approved";
    case "content.video_rejected":
      return `Video rejected${meta.reason ? ` — ${meta.reason}` : ""}`;
    case "content.video_regenerate_requested":
      return meta.ok ? "Regenerate requested — new attempt submitted to ViewMax" : `Regenerate requested — failed (${meta.reason ?? "unknown reason"})`;
    case "content.copy_edited":
      return "Title/caption/hashtags hand-edited";
    default:
      return entry.action;
  }
}
