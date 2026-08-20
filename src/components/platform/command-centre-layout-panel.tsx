"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, RotateCcw, ChevronUp, ChevronDown, Eye, EyeOff, RectangleHorizontal, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateCommandCentreLayout, resetCommandCentreLayout } from "@/app/studio/(authed)/settings/actions";
import {
  ALL_BLOCK_IDS,
  BLOCK_LABELS,
  isStatBlockId,
  type Block,
  type BlockId,
  type BlockSpan,
  type StatBlockId,
} from "@/lib/command-centre-layout";

// Command Centre Phase 5b — generalises Phase 5a's stat-card-only panel
// into a real block canvas: reorder, hide/show, and (for stat blocks
// only — see command-centre-layout.ts's own comment on why section
// blocks always render full-width) a width toggle. Still no
// drag-and-drop and no per-block field configuration (chart metric,
// custom titles) — that's Phase 5c, once there's a block type that
// actually needs a field to configure.
export function CommandCentreLayoutPanel({ initialBlocks }: { initialBlocks: Block[] }) {
  const [order, setOrder] = useState<BlockId[]>(() => {
    const present = initialBlocks.map((b) => b.id);
    const missing = ALL_BLOCK_IDS.filter((id) => !present.includes(id));
    return [...present, ...missing];
  });
  const [hidden, setHidden] = useState<Set<BlockId>>(() => {
    const present = new Set(initialBlocks.map((b) => b.id));
    return new Set(ALL_BLOCK_IDS.filter((id) => !present.has(id)));
  });
  const [spans, setSpans] = useState<Record<StatBlockId, BlockSpan>>(() => {
    const map = {} as Record<StatBlockId, BlockSpan>;
    for (const b of initialBlocks) {
      if (isStatBlockId(b.id)) map[b.id] = (b as { id: StatBlockId; span: BlockSpan }).span;
    }
    return map;
  });
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const isCustomised =
    order.some((id, i) => id !== ALL_BLOCK_IDS[i]) ||
    hidden.size > 0 ||
    Object.values(spans).some((s) => s === 2);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function toggleHidden(id: BlockId) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
  }

  function toggleSpan(id: StatBlockId) {
    setSpans((prev) => ({ ...prev, [id]: (prev[id] ?? 1) === 2 ? 1 : 2 }));
  }

  function save() {
    setStatus("idle");
    setError(null);
    const visible = order.filter((id) => !hidden.has(id));
    const blocks: Block[] = visible.map((id) => (isStatBlockId(id) ? { id, span: spans[id] ?? 1 } : { id }));
    startTransition(async () => {
      const r = await updateCommandCentreLayout(blocks);
      if (r && "error" in r) setError(r.error ?? "Failed to save.");
      else setStatus("saved");
    });
  }

  function reset() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await resetCommandCentreLayout();
      if (r && "error" in r) {
        setError(r.error ?? "Failed to reset.");
        return;
      }
      setOrder(ALL_BLOCK_IDS);
      setHidden(new Set());
      setSpans({} as Record<StatBlockId, BlockSpan>);
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
          Choose which blocks show on your Command Centre, their order, and — for stat cards — whether they stand
          out at double width.
        </p>

        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {order.map((id, index) => {
            const isHidden = hidden.has(id);
            const isStat = isStatBlockId(id);
            const span = isStat ? (spans[id as StatBlockId] ?? 1) : null;
            return (
              <li key={id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${BLOCK_LABELS[id]} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${BLOCK_LABELS[id]} down`}
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <span className={`flex-1 text-sm ${isHidden ? "text-muted-foreground line-through" : ""}`}>
                  {BLOCK_LABELS[id]}
                </span>
                {isStat && !isHidden && (
                  <button
                    type="button"
                    aria-label={span === 2 ? `Make ${BLOCK_LABELS[id]} standard width` : `Make ${BLOCK_LABELS[id]} double width`}
                    onClick={() => toggleSpan(id as StatBlockId)}
                    className="text-muted-foreground hover:text-foreground"
                    title={span === 2 ? "Double width" : "Standard width"}
                  >
                    {span === 2 ? <RectangleHorizontal className="size-4" /> : <Square className="size-4" />}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={isHidden ? `Show ${BLOCK_LABELS[id]}` : `Hide ${BLOCK_LABELS[id]}`}
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
