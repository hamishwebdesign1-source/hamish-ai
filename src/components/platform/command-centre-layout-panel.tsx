"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, RotateCcw, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateCommandCentreCards, resetCommandCentreCards } from "@/app/studio/(authed)/settings/actions";
import { CARD_LABELS, DEFAULT_CARD_ORDER, type CommandCentreCardId } from "@/lib/command-centre-layout";

// Command Centre Phase 5, first real slice — deliberately not a
// drag-and-drop builder (that's the much bigger §22-23 vision, scoped
// separately). Up/down buttons plus a visibility toggle per card is a
// smaller, lower-risk surface that still delivers the actual ask: show,
// hide, and reorder. `order` always contains all 5 known ids so a
// hidden card keeps its place if re-shown, rather than jumping to the
// end; only the visible ones are what's actually sent to save.
export function CommandCentreLayoutPanel({ initialOrder }: { initialOrder: CommandCentreCardId[] }) {
  const [order, setOrder] = useState<CommandCentreCardId[]>(() => {
    const missing = DEFAULT_CARD_ORDER.filter((id) => !initialOrder.includes(id));
    return [...initialOrder, ...missing];
  });
  const [hidden, setHidden] = useState<Set<CommandCentreCardId>>(
    () => new Set(DEFAULT_CARD_ORDER.filter((id) => !initialOrder.includes(id)))
  );
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isCustomised = order.some((id, i) => id !== DEFAULT_CARD_ORDER[i]) || hidden.size > 0;

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function toggleHidden(id: CommandCentreCardId) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
  }

  function save() {
    setStatus("idle");
    setError(null);
    const visible = order.filter((id) => !hidden.has(id));
    startTransition(async () => {
      const r = await updateCommandCentreCards(visible);
      if (r && "error" in r) setError(r.error ?? "Failed to save.");
      else setStatus("saved");
    });
  }

  function reset() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await resetCommandCentreCards();
      if (r && "error" in r) {
        setError(r.error ?? "Failed to reset.");
        return;
      }
      setOrder(DEFAULT_CARD_ORDER);
      setHidden(new Set());
      setStatus("saved");
    });
  }

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <LayoutGrid className="size-4" />
          </span>
          Command Centre layout
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Choose which stat cards show at the top of your Command Centre, and in what order.
        </p>

        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {order.map((id, index) => {
            const isHidden = hidden.has(id);
            return (
              <li key={id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${CARD_LABELS[id]} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${CARD_LABELS[id]} down`}
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <span className={`flex-1 text-sm ${isHidden ? "text-muted-foreground line-through" : ""}`}>
                  {CARD_LABELS[id]}
                </span>
                <button
                  type="button"
                  aria-label={isHidden ? `Show ${CARD_LABELS[id]}` : `Hide ${CARD_LABELS[id]}`}
                  onClick={() => toggleHidden(id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save layout"}
          </Button>
          {isCustomised && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={reset}>
              <RotateCcw className="size-3.5" /> Reset to default
            </Button>
          )}
        </div>
        {status === "saved" && <p className="mt-2 text-xs text-accent">Saved — your Command Centre updates now.</p>}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
