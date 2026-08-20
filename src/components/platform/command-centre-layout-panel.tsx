"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, RotateCcw, ChevronUp, ChevronDown, Eye, EyeOff, RectangleHorizontal, Square, Trash2, LineChart, Type, Link2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCommandCentreLayout, resetCommandCentreLayout } from "@/app/studio/(authed)/settings/actions";
import {
  DEFAULT_LAYOUT,
  STAT_LABELS,
  SECTION_LABELS,
  CHART_METRIC_LABELS,
  CHART_KIND_LABELS,
  generateBlockId,
  type Block,
  type ChartMetric,
  type ChartKind,
} from "@/lib/command-centre-layout";

const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function blockLabel(block: Block): string {
  if (block.type === "stat") return STAT_LABELS[block.cardId];
  if (block.type === "actions_required" || block.type === "insights" || block.type === "briefing") return SECTION_LABELS[block.type];
  if (block.type === "chart") return `Chart — ${CHART_METRIC_LABELS[block.metric]}`;
  if (block.type === "text") return block.title || "Text block";
  return block.label || "Call to action";
}

// Command Centre Phase 5c — the settings panel grows from "toggle/reorder
// 8 fixed blocks" (Phase 5b) into a real add/remove/configure canvas for
// three genuinely new block types: chart (sourced from studio-analytics.ts's
// two real time-series, nothing invented), text, and call-to-action. The
// original 8 singleton blocks (stat cards + the 3 section cards) keep
// their Phase 5b show/hide + reorder + (stat only) resize controls
// unchanged; chart/text/cta blocks are add/reorder/resize/delete with
// their own inline fields, since "hide" doesn't mean anything for a
// block that only exists because someone added it.
export function CommandCentreLayoutPanel({ initialBlocks }: { initialBlocks: Block[] }) {
  const [draftBlocks, setDraftBlocks] = useState<Record<string, Block>>(() => {
    const map: Record<string, Block> = {};
    for (const b of initialBlocks) map[b.id] = b;
    for (const b of DEFAULT_LAYOUT.blocks) if (!(b.id in map)) map[b.id] = b;
    return map;
  });
  const [order, setOrder] = useState<string[]>(() => {
    const present = initialBlocks.map((b) => b.id);
    const missingSingletons = DEFAULT_LAYOUT.blocks.map((b) => b.id).filter((id) => !present.includes(id));
    return [...present, ...missingSingletons];
  });
  const [hidden, setHidden] = useState<Set<string>>(() => {
    const present = new Set(initialBlocks.map((b) => b.id));
    return new Set(DEFAULT_LAYOUT.blocks.map((b) => b.id).filter((id) => !present.has(id)));
  });
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const defaultIds = DEFAULT_LAYOUT.blocks.map((b) => b.id);
  const isCustomised =
    order.length !== defaultIds.length ||
    order.some((id, i) => id !== defaultIds[i]) ||
    hidden.size > 0 ||
    Object.values(draftBlocks).some((b) => b.type === "stat" && b.span === 2);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function toggleHidden(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
  }

  function toggleSpan(id: string) {
    setDraftBlocks((prev) => {
      const b = prev[id];
      if (!b || !("span" in b)) return prev;
      return { ...prev, [id]: { ...b, span: b.span === 2 ? 1 : 2 } as Block };
    });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setDraftBlocks((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } as Block } : prev));
  }

  function addBlock(type: "chart" | "text" | "cta") {
    const id = generateBlockId(type);
    const block: Block =
      type === "chart"
        ? { id, type, metric: "revenue", kind: "area", span: 2 }
        : type === "text"
          ? { id, type, title: "New note", body: "", span: 2 }
          : { id, type: "cta", label: "Learn more", href: "/studio/settings", span: 1 };
    setDraftBlocks((prev) => ({ ...prev, [id]: block }));
    setOrder((prev) => [...prev, id]);
  }

  function removeBlock(id: string) {
    setOrder((prev) => prev.filter((x) => x !== id));
    setDraftBlocks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function save() {
    setStatus("idle");
    setError(null);
    const blocks: Block[] = order
      .map((id) => draftBlocks[id])
      .filter((b): b is Block => Boolean(b))
      .filter((b) => b.type === "chart" || b.type === "text" || b.type === "cta" || !hidden.has(b.id));
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
      const map: Record<string, Block> = {};
      for (const b of DEFAULT_LAYOUT.blocks) map[b.id] = b;
      setDraftBlocks(map);
      setOrder(defaultIds);
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
          Choose which blocks show on your Command Centre, their order and width, and add your own chart, text, or
          call-to-action blocks.
        </p>

        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {order.map((id, index) => {
            const block = draftBlocks[id];
            if (!block) return null;
            const isSingleton = block.type === "stat" || block.type === "actions_required" || block.type === "insights" || block.type === "briefing";
            const isHiddenBlock = isSingleton && hidden.has(id);
            const hasSpan = "span" in block;

            return (
              <li key={id} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${blockLabel(block)} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${blockLabel(block)} down`}
                      disabled={index === order.length - 1}
                      onClick={() => move(index, 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <span className={`flex-1 truncate text-sm ${isHiddenBlock ? "text-muted-foreground line-through" : ""}`}>
                    {blockLabel(block)}
                  </span>
                  {hasSpan && !isHiddenBlock && (
                    <button
                      type="button"
                      aria-label={block.span === 2 ? `Make ${blockLabel(block)} standard width` : `Make ${blockLabel(block)} double width`}
                      onClick={() => toggleSpan(id)}
                      className="text-muted-foreground hover:text-foreground"
                      title={block.span === 2 ? "Double width" : "Standard width"}
                    >
                      {block.span === 2 ? <RectangleHorizontal className="size-4" /> : <Square className="size-4" />}
                    </button>
                  )}
                  {isSingleton ? (
                    <button
                      type="button"
                      aria-label={isHiddenBlock ? `Show ${blockLabel(block)}` : `Hide ${blockLabel(block)}`}
                      onClick={() => toggleHidden(id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isHiddenBlock ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Remove ${blockLabel(block)}`}
                      onClick={() => removeBlock(id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {block.type === "chart" && (
                  <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">
                    <select
                      value={block.metric}
                      onChange={(e) => updateBlock(id, { metric: e.target.value as ChartMetric })}
                      className={selectClasses}
                      aria-label="Chart metric"
                    >
                      {Object.entries(CHART_METRIC_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={block.kind}
                      onChange={(e) => updateBlock(id, { kind: e.target.value as ChartKind })}
                      className={selectClasses}
                      aria-label="Chart type"
                    >
                      {Object.entries(CHART_KIND_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {block.type === "text" && (
                  <div className="mt-2 ml-6 space-y-1.5">
                    <Input
                      value={block.title}
                      onChange={(e) => updateBlock(id, { title: e.target.value })}
                      placeholder="Title"
                      maxLength={60}
                      aria-label="Text block title"
                    />
                    <Textarea
                      value={block.body}
                      onChange={(e) => updateBlock(id, { body: e.target.value })}
                      placeholder="What do you want to say?"
                      rows={2}
                      maxLength={500}
                      aria-label="Text block body"
                    />
                  </div>
                )}

                {block.type === "cta" && (
                  <div className="mt-2 ml-6 flex flex-wrap items-center gap-1.5">
                    <Input
                      value={block.label}
                      onChange={(e) => updateBlock(id, { label: e.target.value })}
                      placeholder="Button label"
                      maxLength={40}
                      className="w-40"
                      aria-label="Call-to-action label"
                    />
                    <Input
                      value={block.href}
                      onChange={(e) => updateBlock(id, { href: e.target.value })}
                      placeholder="/studio/prospects or https://…"
                      className="w-56"
                      aria-label="Call-to-action link"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => addBlock("chart")}>
            <Plus className="size-3.5" />
            <LineChart className="size-3.5" /> Chart
          </Button>
          <Button size="xs" variant="outline" onClick={() => addBlock("text")}>
            <Plus className="size-3.5" />
            <Type className="size-3.5" /> Text
          </Button>
          <Button size="xs" variant="outline" onClick={() => addBlock("cta")}>
            <Plus className="size-3.5" />
            <Link2 className="size-3.5" /> Call to action
          </Button>
        </div>

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
