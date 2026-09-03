"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateWebsiteMockup } from "@/app/studio/(authed)/prospects/actions";
import type { WebsiteMockup } from "@/lib/draft-website-mockup";
import type { Prospect } from "./types";

// The mockup preview — deliberately plain *content* (no custom design, no
// images, no invented URL/domain), so the framing stays honest about what
// this is: written homepage copy, not the real hand-built concept pages
// HamishAI itself builds. What changed (UX/UI Director pass): a browser-
// chrome frame (three dots + a centred pill, same shape a real browser
// tab bar has) so this reads as "a page," not a form response — the pill
// holds the same honest "Homepage preview" label the old header bar had
// rather than a fabricated domain a viewer could mistake for something
// real. Three visually distinct bands (hero / body / closing CTA) give it
// real hierarchy instead of one flat stack of paragraphs, same idea any
// actual homepage uses, without adding a single pixel of invented bespoke
// design. The "AI-drafted" tag reuses the established `ai` Badge variant
// (badge.tsx) rather than a one-off label.
function WebsiteMockupPreview({ mockup }: { mockup: WebsiteMockup }) {
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
          </div>
          <div className="min-w-0 flex-1 truncate rounded-md bg-background/50 px-2.5 py-1 text-center font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            Homepage preview
          </div>
          <Badge variant="ai" className="shrink-0">
            AI-drafted
          </Badge>
        </div>

        <div className="border-b border-border bg-secondary/20 px-5 py-6 sm:px-6 sm:py-7">
          <p className="font-heading text-xl font-semibold text-balance sm:text-2xl">{mockup.hero_headline}</p>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{mockup.hero_subheadline}</p>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm">{mockup.problem_statement}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {mockup.services.map((s) => (
              <div key={s.name} className="rounded-md border border-border/60 bg-secondary/30 p-2.5">
                <p className="text-xs font-semibold">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-accent/5 px-5 py-5 text-center sm:px-6">
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">{mockup.ai_pitch}</p>
          <Button size="sm" disabled className="mt-3 pointer-events-none opacity-80">
            {mockup.cta_text}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        AI-written homepage copy, shown as a page preview — not a designed page.
      </p>
    </div>
  );
}

export function WebsiteMockupSection({ prospect }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {prospect.website_mockup ? (
        <WebsiteMockupPreview mockup={prospect.website_mockup} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No mockup yet — AI-written homepage copy for this prospect, not a designed page.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await generateWebsiteMockup(prospect.id);
                if (r && "error" in r) setError(r.error ?? "Mockup generation failed.");
              })
            }
          >
            {pending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Writing…
              </>
            ) : (
              <>
                <LayoutTemplate className="size-3.5" /> Generate mockup
              </>
            )}
          </Button>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
