import Link from "next/link";
import { Sparkles, Film } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { addContentIdea } from "@/app/admin/actions";
import { CONTENT_IDEA_STATUSES, contentIdeaStatusMeta } from "@/lib/content-idea-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";

// Content Factory MVP Phase A (docs/content-factory-plan.md) — Idea
// Discovery/Research/Scoring only. Follows the exact list-page shape of
// /admin/leads: server component, one Promise.all fetch, filter counts
// computed client-side over the already-fetched array, force-dynamic
// (Next silently statically-freezes pages that don't read a dynamic API
// otherwise — a real bug hit twice elsewhere in this codebase already).
export const dynamic = "force-dynamic";

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function ContentFactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: allIdeas, error } = supabase
    ? await supabase.from("content_ideas").select("*").order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) console.error("Failed to fetch content ideas:", error);

  const counts = CONTENT_IDEA_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: allIdeas?.filter((i) => i.status === s).length ?? 0 }),
    {} as Record<string, number>
  );

  const ideas = statusFilter ? allIdeas?.filter((i) => i.status === statusFilter) : allIdeas;

  function filterHref(status: string | undefined) {
    return status ? `/admin/content-factory?status=${status}` : "/admin/content-factory";
  }

  const awaitingReview = (allIdeas ?? []).filter((i) => ["script_review", "video_review"].includes(i.status)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-page-title">Content Factory</h1>
        <Badge variant="ai" className="gap-1">
          <Sparkles className="size-3" />
          AI-run pipeline
        </Badge>
      </div>
      <p className="text-page-subtitle mt-1">
        Idea discovery → research → scoring → script → ViewMax video → your approval. See docs/content-factory-plan.md for the full
        pipeline and what&apos;s built so far (Phase A: discovery, research, scoring).
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{allIdeas?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total ideas</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{counts.new}</p>
          <p className="text-xs text-muted-foreground">New, unresearched</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{counts.researched}</p>
          <p className="text-xs text-muted-foreground">Researched</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{awaitingReview}</p>
          <p className="text-xs text-muted-foreground">Awaiting your review</p>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card/50 p-3">
        <FilterTabs
          activeKey={statusFilter}
          options={[
            { key: undefined, label: "All", href: filterHref(undefined) },
            ...CONTENT_IDEA_STATUSES.map((s) => ({
              key: s,
              label: contentIdeaStatusMeta[s].label,
              count: counts[s],
              href: filterHref(s),
            })),
          ]}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add an idea</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addContentIdea} className="mt-2 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Working title" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="concept">Concept / hook</Label>
                <Textarea id="concept" name="concept" placeholder="One or two sentences — the actual premise." rows={3} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" name="topic" placeholder="AI tools and productivity" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="platform_target">Platform target</Label>
                <select id="platform_target" name="platform_target" defaultValue="shorts" className={selectClasses}>
                  <option value="shorts">YouTube Shorts</option>
                  <option value="tiktok">TikTok</option>
                  <option value="reels">Instagram Reels</option>
                </select>
              </div>
              <Button type="submit" className="w-full">
                Add idea
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {!ideas?.length && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Film className="size-6 text-muted-foreground/60" />
                No ideas in this view yet.
              </CardContent>
            </Card>
          )}
          <ul className="space-y-3">
            {ideas?.map((idea) => (
              <li key={idea.id} className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40">
                <Link href={`/admin/content-factory/${idea.id}`} className="absolute inset-0 z-0 rounded-xl" aria-label={`Open ${idea.title}`} />

                <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{idea.title}</p>
                      {idea.source === "ai" && (
                        <Badge variant="ai" className="gap-1">
                          <Sparkles className="size-3" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{[idea.topic, idea.platform_target].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{idea.concept}</p>
                    {idea.research?.suggested_angle && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground italic">
                        <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--gradient-violet)]" />
                        &ldquo;{idea.research.suggested_angle}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={contentIdeaStatusMeta[idea.status as keyof typeof contentIdeaStatusMeta]?.variant ?? "secondary"}>
                      {contentIdeaStatusMeta[idea.status as keyof typeof contentIdeaStatusMeta]?.label ?? idea.status}
                    </Badge>
                  </div>
                </div>

                {idea.score != null && (
                  <div className="relative z-10 mt-3 flex items-center gap-0.5" title={`Score: ${idea.score}/5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`size-1.5 rounded-full ${n <= idea.score ? "bg-accent" : "bg-border"}`} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
