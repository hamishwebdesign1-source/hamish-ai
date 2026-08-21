"use client";

import { useState, useTransition } from "react";
import { RotateCcw, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { regenerateWebsiteBrief } from "@/app/studio/(authed)/website-builder/actions";
import type { WebsiteBrief, WebsiteDiscovery } from "@/lib/website-brief";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-heading text-sm font-semibold">{title}</p>
      <div className="mt-1.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// AI Website Creation Guide, WB1 — the Website Build Brief is the
// project's source of truth (§3 of the brief). Regenerating is an
// explicit action, never automatic — same convention as every other
// cached AI-generated artifact in this app (sales kits, layout
// redesigns): a real AI call, never fired without the user asking for it.
export function WebsiteBriefPanel({
  projectId,
  brief,
  briefGeneratedAt,
  discovery,
}: {
  projectId: string;
  brief: WebsiteBrief | null;
  briefGeneratedAt: string | null;
  discovery: WebsiteDiscovery | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const r = await regenerateWebsiteBrief(projectId);
      if (r && "error" in r) setError(r.error);
    });
  }

  if (!brief) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {discovery ? "The brief hasn't generated yet." : "No discovery answers found for this project."}
          </p>
          <Button size="sm" className="mt-4" disabled={pending || !discovery} onClick={regenerate}>
            {pending ? "Generating…" : "Generate brief"}
          </Button>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" />
          {briefGeneratedAt ? `Generated ${new Date(briefGeneratedAt).toLocaleString("en-GB")}` : "Generated"}
        </p>
        <Button size="xs" variant="ghost" disabled={pending} onClick={regenerate}>
          <RotateCcw className="size-3.5" /> {pending ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card>
        <CardContent className="space-y-5">
          <Section title="Business overview">
            <p>{brief.businessOverview}</p>
          </Section>
          <Section title="Target audience">
            <p>{brief.targetAudience}</p>
          </Section>
          <Section title="Objectives">
            <BulletList items={brief.objectives} />
          </Section>
          <Section title="Sitemap">
            <ul className="space-y-1.5">
              {brief.sitemap.map((s, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{s.page}</span> — {s.purpose}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Content requirements">
            <BulletList items={brief.contentRequirements} />
          </Section>
          <Section title="Brand guidelines">
            <p>{brief.brandGuidelines}</p>
          </Section>
          <Section title="Design direction">
            <p>{brief.designDirection}</p>
          </Section>
          <Section title="Call-to-action strategy">
            <p>{brief.ctaStrategy}</p>
          </Section>
          <Section title="SEO requirements">
            <BulletList items={brief.seoRequirements} />
          </Section>
          <Section title="Analytics requirements">
            <BulletList items={brief.analyticsRequirements} />
          </Section>
          <Section title="Technical requirements">
            <BulletList items={brief.technicalRequirements} />
          </Section>
          <Section title="Acceptance criteria">
            <BulletList items={brief.acceptanceCriteria} />
          </Section>
        </CardContent>
      </Card>

    </div>
  );
}
