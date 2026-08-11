"use client";

import { useActionState, useState, useTransition } from "react";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Pencil, Check, X, Film, Clock } from "lucide-react";
import { generateIdeaScripts, selectContentScript, editContentScript, type ContentScriptsState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/time-ago";
import type { ScriptBeats, SceneBeat } from "@/lib/generate-content-scripts";
import type { VideoPromptSpec } from "@/lib/generate-video-prompt";

export type ScriptRow = {
  id: string;
  style: "curiosity" | "shock" | "story";
  status: "candidate" | "selected" | "rejected";
  hook: string;
  beats: ScriptBeats;
  scene_breakdown: SceneBeat[];
  score: number | null;
  score_rationale: string | null;
  video_prompt: VideoPromptSpec | null;
  prompt_generated_at: string | null;
  edited: boolean;
  created_at: string;
};

const STYLE_LABELS: Record<string, string> = { curiosity: "Curiosity", shock: "Shock/surprise", story: "Story-driven" };

function ScoreDots({ score }: { score: number | null }) {
  if (score == null) return null;
  const filled = Math.round(score / 2); // 0-10 -> 0-5 dots
  return (
    <div className="flex items-center gap-0.5" title={`AI self-score: ${score}/10`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-1.5 rounded-full ${n <= filled ? "bg-accent" : "bg-border"}`} />
      ))}
    </div>
  );
}

function SceneList({ scenes }: { scenes: SceneBeat[] }) {
  return (
    <ol className="space-y-1 border-l border-border pl-3 text-xs">
      {[...scenes]
        .sort((a, b) => a.order - b.order)
        .map((s) => (
          <li key={s.order}>
            <span className="font-medium text-foreground capitalize">{s.beat}</span>{" "}
            <span className="text-muted-foreground">(~{s.duration_s}s)</span> — {s.visual_description}
            {s.on_screen_text && <span className="text-muted-foreground italic"> · text: &ldquo;{s.on_screen_text}&rdquo;</span>}
          </li>
        ))}
    </ol>
  );
}

function ScriptEditForm({ ideaId, script, onDone }: { ideaId: string; script: ScriptRow; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await editContentScript(script.id, ideaId, formData);
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
      <div className="space-y-1">
        <label className="font-medium text-foreground">Hook</label>
        <Textarea name="hook" defaultValue={script.hook} rows={2} className="text-xs" />
      </div>
      <div className="space-y-1">
        <label className="font-medium text-foreground">Setup</label>
        <Textarea name="setup" defaultValue={script.beats.setup} rows={2} className="text-xs" />
      </div>
      <div className="space-y-1">
        <label className="font-medium text-foreground">Escalation</label>
        <Textarea name="escalation" defaultValue={script.beats.escalation} rows={2} className="text-xs" />
      </div>
      <div className="space-y-1">
        <label className="font-medium text-foreground">Payoff</label>
        <Textarea name="payoff" defaultValue={script.beats.payoff} rows={2} className="text-xs" />
      </div>
      <div className="space-y-1">
        <label className="font-medium text-foreground">Ending</label>
        <Textarea name="ending" defaultValue={script.beats.ending} rows={2} className="text-xs" />
      </div>
      <div className="flex items-center gap-1.5">
        <Button type="submit" size="xs" disabled={isPending} className="gap-1">
          <Check className="size-3" />
          {isPending ? "Saving…" : "Save edit"}
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
      <p className="text-muted-foreground">Saving re-generates the ViewMax video prompt to match the edited text.</p>
    </form>
  );
}

function VideoPromptPanel({ videoPrompt, generatedAt }: { videoPrompt: VideoPromptSpec; generatedAt: string | null }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-[color-mix(in_oklch,var(--gradient-violet),transparent_75%)] bg-[color-mix(in_oklch,var(--gradient-violet),transparent_92%)] p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-medium text-foreground">
          <Film className="size-3" />
          ViewMax video prompt
        </p>
        {generatedAt && <span className="text-muted-foreground">{timeAgo(generatedAt)}</span>}
      </div>
      <p className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{videoPrompt.duration_s}s</Badge>
        <Badge variant="secondary">{videoPrompt.aspect_ratio}</Badge>
        <Badge variant="secondary">{videoPrompt.resolution}</Badge>
      </p>
      <p className="text-muted-foreground italic">{videoPrompt.style_notes}</p>
      <p className="rounded-md border border-border bg-card p-2 whitespace-pre-line text-foreground">{videoPrompt.prompt}</p>
    </div>
  );
}

// Content Factory MVP Phase B — the selected script is auto-picked (see
// generate-content-scripts.ts's file header for why there's no mandatory
// "choose one of three" gate); this panel shows it plus, collapsed, the
// two variants that weren't picked, each with its own AI score/rationale
// and a "Use this instead" override.
export function ContentScriptPanel({ ideaId, scripts }: { ideaId: string; scripts: ScriptRow[] }) {
  const [othersExpanded, setOthersExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const boundGenerate = generateIdeaScripts.bind(null, ideaId);
  const [genState, genFormAction, genPending] = useActionState<ContentScriptsState, FormData>(boundGenerate, {});

  if (scripts.length === 0) {
    return <p className="text-sm text-muted-foreground">No scripts generated yet.</p>;
  }

  const selected = scripts.find((s) => s.status === "selected") ?? scripts[0];
  const others = scripts.filter((s) => s.id !== selected.id);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="ai" className="gap-1">
              <Sparkles className="size-3" />
              {STYLE_LABELS[selected.style] ?? selected.style}
            </Badge>
            {selected.edited && <Badge variant="outline">Hand-edited</Badge>}
            <ScoreDots score={selected.score} />
          </div>
          <Button type="button" variant="ghost" size="xs" onClick={() => setEditing((v) => !v)} className="gap-1 text-muted-foreground">
            <Pencil className="size-3" />
            {editing ? "Cancel edit" : "Edit"}
          </Button>
        </div>

        {editing ? (
          <div className="mt-2">
            <ScriptEditForm ideaId={ideaId} script={selected} onDone={() => setEditing(false)} />
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-sm font-medium text-foreground">&ldquo;{selected.hook}&rdquo;</p>
            <p>
              <span className="font-medium text-foreground">Setup: </span>
              {selected.beats.setup}
            </p>
            <p>
              <span className="font-medium text-foreground">Escalation: </span>
              {selected.beats.escalation}
            </p>
            <p>
              <span className="font-medium text-foreground">Payoff: </span>
              {selected.beats.payoff}
            </p>
            <p>
              <span className="font-medium text-foreground">Ending: </span>
              {selected.beats.ending}
            </p>
            {selected.score_rationale && (
              <p className="flex items-start gap-1.5 text-muted-foreground italic">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--gradient-violet)]" />
                &ldquo;{selected.score_rationale}&rdquo;
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-muted-foreground select-none">Scene breakdown</summary>
              <div className="mt-1.5">
                <SceneList scenes={selected.scene_breakdown} />
              </div>
            </details>
          </div>
        )}
      </div>

      {selected.video_prompt ? (
        <VideoPromptPanel videoPrompt={selected.video_prompt} generatedAt={selected.prompt_generated_at} />
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          Video prompt not generated yet.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form action={genFormAction}>
          <Button type="submit" variant="outline" size="xs" disabled={genPending} className="gap-1">
            <RefreshCw className={`size-3 ${genPending ? "animate-spin" : ""}`} />
            {genPending ? "Regenerating…" : "Regenerate all 3 variants"}
          </Button>
        </form>
        {others.length > 0 && (
          <Button type="button" variant="ghost" size="xs" onClick={() => setOthersExpanded((v) => !v)} className="gap-1 text-muted-foreground">
            {othersExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {othersExpanded ? "Hide" : "Show"} other variants ({others.length})
          </Button>
        )}
      </div>

      {genState.needsConfirm && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
          <span>{genState.error}</span>
          <form action={genFormAction}>
            <input type="hidden" name="force" value="1" />
            <Button type="submit" size="xs" variant="outline" disabled={genPending} className="gap-1">
              <X className="size-3" />
              Regenerate anyway
            </Button>
          </form>
        </div>
      )}
      {genState.error && !genState.needsConfirm && <p className="text-xs text-destructive">{genState.error}</p>}

      {othersExpanded && others.length > 0 && (
        <div className="space-y-2">
          {others.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary">{STYLE_LABELS[s.style] ?? s.style}</Badge>
                  <ScoreDots score={s.score} />
                </div>
                <form action={selectContentScript.bind(null, s.id, ideaId)}>
                  <Button type="submit" variant="outline" size="xs">
                    Use this instead
                  </Button>
                </form>
              </div>
              <p className="mt-1.5 font-medium text-foreground">&ldquo;{s.hook}&rdquo;</p>
              {s.score_rationale && <p className="mt-1 text-muted-foreground italic">&ldquo;{s.score_rationale}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
