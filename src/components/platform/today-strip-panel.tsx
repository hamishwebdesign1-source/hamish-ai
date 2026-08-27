"use client";

import { useState, useTransition } from "react";
import { ListOrdered, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateTodayStripStats } from "@/app/studio/(authed)/settings/actions";
import { TODAY_STAT_IDS, TODAY_STAT_LABELS, TODAY_STRIP_MAX, type TodayStatId } from "@/lib/today-strip-config";

// Command Centre improvement #6 — deliberately simpler than
// CommandCentreLayoutPanel's canvas (no spans, no add/remove, no AI
// assistant): the TODAY strip is always exactly TODAY_STRIP_MAX slots,
// picked from a small fixed pool, so a set of toggle chips plus the
// same up/down move() idiom that panel already uses for its own
// reordering is the right amount of UI for this, not a second full
// drag-canvas.
export function TodayStripPanel({ initialStats }: { initialStats: TodayStatId[] }) {
  const [selected, setSelected] = useState<TodayStatId[]>(initialStats);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function toggle(id: TodayStatId) {
    setStatus("idle");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= TODAY_STRIP_MAX) return prev;
      return [...prev, id];
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
    setStatus("idle");
  }

  function save() {
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const r = await updateTodayStripStats(selected);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
        return;
      }
      setStatus("saved");
    });
  }

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ListOrdered className="size-4" />
          </span>
          Today strip
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The {TODAY_STRIP_MAX} numbers at the top of your Command Centre — pick which ones, and what order.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {TODAY_STAT_IDS.map((id) => {
            const isSelected = selected.includes(id);
            const disabled = !isSelected && selected.length >= TODAY_STRIP_MAX;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : disabled
                      ? "cursor-not-allowed border-border text-muted-foreground/40"
                      : "border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                {TODAY_STAT_LABELS[id]}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <ol className="mt-4 space-y-1.5">
            {selected.map((id, i) => (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-border py-1 pr-1 pl-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{TODAY_STAT_LABELS[id]}</span>
                {/* Real touch-target fix — a bare 14px icon in an
                    unpadded button was ~14x14px tappable, well under the
                    44x44 guideline. size-9 (36px) matches the icon-
                    button size already used elsewhere in this codebase
                    (e.g. the avatar squares in clients-panel.tsx). */}
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${TODAY_STAT_LABELS[id]} earlier`}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={i === selected.length - 1}
                  onClick={() => move(i, 1)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${TODAY_STAT_LABELS[id]} later`}
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" disabled={pending || selected.length === 0} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {status === "saved" && <span className="text-xs text-accent">Saved.</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
