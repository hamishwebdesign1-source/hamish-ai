"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateWebsiteMockup } from "@/app/studio/(authed)/prospects/actions";
import type { WebsiteMockup } from "@/lib/draft-website-mockup";
import type { Prospect } from "./types";

// The mockup preview — deliberately plain (no custom design, no images),
// so the framing is honest about what this is: written homepage copy, not
// the real hand-built concept pages HamishAI itself builds. A border and
// a little internal padding is enough to read as "a preview of a page,"
// without pretending to be a finished website.
function WebsiteMockupPreview({ mockup }: { mockup: WebsiteMockup }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-secondary/40 px-4 py-2">
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Homepage preview</p>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="font-heading text-lg font-semibold text-balance">{mockup.hero_headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{mockup.hero_subheadline}</p>
        </div>
        <p className="text-sm">{mockup.problem_statement}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {mockup.services.map((s) => (
            <div key={s.name} className="rounded-md bg-secondary/30 p-2.5">
              <p className="text-xs font-semibold">{s.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
        <p className="rounded-md border border-accent/30 bg-accent/5 p-2.5 text-xs">{mockup.ai_pitch}</p>
        <Button size="sm" disabled className="pointer-events-none opacity-80">
          {mockup.cta_text}
        </Button>
      </div>
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
