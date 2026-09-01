"use client";

import { useState, useTransition } from "react";
import { Receipt, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateRateCard } from "@/app/studio/(authed)/settings/actions";
import type { RateCardItem } from "@/lib/rate-card";

// Roadmap item #6 — the one Studio-side control for rate-card.ts. Local
// draft state, saved as a whole list on "Save" (same shape
// CommandCentreLayoutPanel's own draft-then-save pattern uses for a
// different owner-edited list) rather than one Server Action call per
// keystroke or per row.
export function RateCardPanel({ initialItems }: { initialItems: RateCardItem[] }) {
  const [items, setItems] = useState<RateCardItem[]>(initialItems);
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<"one-off" | "monthly">("one-off");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    const trimmedLabel = label.trim();
    const pounds = Number(price);
    if (!trimmedLabel || !Number.isFinite(pounds) || pounds < 0) return;
    setItems((prev) => [...prev, { label: trimmedLabel, pricePence: Math.round(pounds * 100), unit }]);
    setLabel("");
    setPrice("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await updateRateCard(items);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
      } else {
        setStatus("saved");
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2.5 font-heading text-sm font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Receipt className="size-4" />
          </span>
          Rate card
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Your own priced services — used to quote real prices on a proposal PDF generated for a prospect.
        </p>

        {items.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="truncate">{item.label}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    £{(item.pricePence / 100).toFixed(item.pricePence % 100 === 0 ? 0 : 2)}
                    {item.unit === "monthly" ? "/mo" : ""}
                  </span>
                  <Button size="icon-xs" variant="ghost" onClick={() => removeItem(i)} aria-label={`Remove ${item.label}`}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Website build"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1500"
            className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value === "monthly" ? "monthly" : "one-off")}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="one-off">one-off</option>
            <option value="monthly">/month</option>
          </select>
          <Button size="sm" variant="outline" onClick={addItem} disabled={!label.trim() || !price}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>

        <Button size="sm" className="mt-3" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save rate card"}
        </Button>
        {status === "saved" && <p className="mt-2 text-xs text-accent">Saved.</p>}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
