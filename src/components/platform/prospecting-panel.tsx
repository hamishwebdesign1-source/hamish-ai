"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Search,
  ExternalLink,
  LoaderCircle,
  CircleAlert,
  Tag,
  MapPin,
  UserPlus,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Gauge,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateProspectingConfig,
  runDiscovery,
  convertProspectToClient,
  researchProspect,
  generateWebsiteMockup,
} from "@/app/studio/(authed)/prospects/actions";
import type { UsageStatus } from "@/lib/usage-limits";
import type { LeadResearch } from "@/lib/research-lead";
import type { WebsiteMockup } from "@/lib/draft-website-mockup";

type Prospect = {
  id: string;
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  score: number | null;
  research: LeadResearch | null;
  research_generated_at: string | null;
  website_mockup: WebsiteMockup | null;
  created_at: string;
};

// A single row's own convert-to-client mini-form — its own component so
// each prospect card's open/closed and pending state is independent, not
// one shared bit of state on the parent tracking "which row is open."
function ConvertToClientControl({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(prospect.email ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof convertProspectToClient>> | null>(null);

  if (prospect.status === "converted") {
    return <Badge variant="secondary">Client</Badge>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" /> Convert to client
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@business.com"
          className="h-8 w-44 text-xs"
          autoFocus
        />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await convertProspectToClient(prospect.id, email);
              setResult(r);
              if ("ok" in r) setOpen(false);
            })
          }
        >
          {pending ? "…" : "Confirm"}
        </Button>
      </div>
      {result && "error" in result && <span className="text-xs text-destructive">{result.error}</span>}
    </div>
  );
}

function ResearchTrigger({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-center">
      <p className="text-sm text-muted-foreground">Not researched yet — no contact details or opportunity analysis found.</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await researchProspect(prospectId);
            if (r && "error" in r) setError(r.error ?? "Research failed.");
          })
        }
      >
        {pending ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin" /> Researching…
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5" /> Research this business
          </>
        )}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const FIT_STYLES: Record<LeadResearch["ai_opportunity_fit"], string> = {
  high: "text-accent",
  medium: "text-muted-foreground",
  low: "text-muted-foreground",
};

function ResearchSummary({ research }: { research: LeadResearch }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Lightbulb className="size-3.5 shrink-0" />
          Why pursue this one
        </p>
        <p className="mt-1 text-sm">{research.pursue_because}</p>
      </div>

      <p className="text-sm text-muted-foreground">{research.business_summary}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{research.estimated_project_value_band}</Badge>
        <Badge variant="secondary" className="capitalize">
          {research.conversion_probability_band} conversion probability
        </Badge>
        <span className={`inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 capitalize ${FIT_STYLES[research.ai_opportunity_fit]}`}>
          <Gauge className="size-3" />
          {research.ai_opportunity_fit} AI fit
        </span>
      </div>

      {research.weaknesses.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ThumbsDown className="size-3.5 shrink-0" /> Weaknesses found
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.weaknesses.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {research.strengths.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ThumbsUp className="size-3.5 shrink-0" /> Strengths
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {research.ai_opportunities.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" /> AI opportunities
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.ai_opportunities.map((o) => (
              <li key={o}>• {o}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-secondary/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Suggested opening line</p>
        <p className="mt-1 text-sm italic">&ldquo;{research.suggested_sales_angle}&rdquo;</p>
      </div>
    </div>
  );
}

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

function WebsiteMockupSection({ prospect }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <LayoutTemplate className="size-3.5 shrink-0" /> Website mockup
      </p>
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

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const hasContact = prospect.phone || prospect.email;

  return (
    <Card>
      <CardContent className="py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{prospect.business_name}</p>
              {prospect.score !== null && (
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">score {prospect.score}/5</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {[prospect.category, prospect.neighbourhood].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {prospect.status !== "converted" && (
              <Badge variant="secondary" className="capitalize">
                {prospect.status.replace(/_/g, " ")}
              </Badge>
            )}
            {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {prospect.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                  <a href={`tel:${prospect.phone}`} className="hover:text-accent">
                    {prospect.phone}
                  </a>
                </span>
              )}
              {prospect.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${prospect.email}`} className="hover:text-accent">
                    {prospect.email}
                  </a>
                </span>
              )}
              {prospect.website && (
                <a
                  href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  Website
                </a>
              )}
              {!hasContact && !prospect.website && (
                <span className="text-xs text-muted-foreground">No contact details found for this business yet.</span>
              )}
            </div>

            {prospect.research ? <ResearchSummary research={prospect.research} /> : <ResearchTrigger prospectId={prospect.id} />}

            {prospect.research && <WebsiteMockupSection prospect={prospect} />}

            <div className="flex justify-end">
              <ConvertToClientControl prospect={prospect} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// A single client component rather than splitting settings/results/usage
// into three — they all react to the same runDiscovery() call (a fresh
// run changes the usage bar and the results list together), and this is
// still a small enough page that three separate components would just add
// prop-plumbing without buying independent reusability.
export function ProspectingPanel({
  initialCategories,
  initialAreas,
  usage,
  prospects,
}: {
  initialCategories: string[];
  initialAreas: string[];
  usage: UsageStatus | null;
  prospects: Prospect[];
}) {
  const [categories, setCategories] = useState(initialCategories.join(", "));
  const [areas, setAreas] = useState(initialAreas.join(", "));
  const [savePending, startSave] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const [runPending, startRun] = useTransition();
  const [runResult, setRunResult] = useState<Awaited<ReturnType<typeof runDiscovery>> | null>(null);

  // Shared by both the explicit "Save niche" button and "Find prospects
  // now" — this used to be two separate actions, which meant typing a
  // niche and clicking "Find prospects now" without first clicking "Save"
  // ran discovery against whatever was already saved (nothing, the first
  // time), not what was actually in the boxes. "Find prospects now" now
  // always saves first, so there's no state where the two can disagree.
  async function saveNiche() {
    return updateProspectingConfig({
      categories: categories.split(",").map((s) => s.trim()).filter(Boolean),
      areas: areas.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  function handleSave() {
    setSaveStatus("idle");
    startSave(async () => {
      const result = await saveNiche();
      setSaveStatus("error" in result ? "error" : "saved");
    });
  }

  function handleRun() {
    setRunResult(null);
    startRun(async () => {
      const saveResult = await saveNiche();
      if ("error" in saveResult) {
        setRunResult({ error: saveResult.error ?? "Failed to save your niche." });
        return;
      }
      const result = await runDiscovery();
      setRunResult(result);
    });
  }

  const atLimit = usage !== null && !usage.allowed;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Prospects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your niche and geography, then find real businesses matching it — the same engine HamishAI runs its
          own weekly search on.
        </p>
      </div>

      {usage && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="font-heading font-semibold">This month</span>
              <span className="font-mono text-muted-foreground">
                {usage.used} / {usage.limit} researched
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }}
              />
            </div>
            {atLimit && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="size-3.5 shrink-0" />
                Monthly limit reached — upgrade your plan to keep finding prospects this month.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <p className="font-heading text-sm font-semibold">Your niche</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categories" className="text-xs">
                <Tag className="size-3" /> Categories
              </Label>
              <Input
                id="categories"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="e.g. Accountants, Bookkeepers"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="areas" className="text-xs">
                <MapPin className="size-3" /> Areas
              </Label>
              <Input
                id="areas"
                value={areas}
                onChange={(e) => setAreas(e.target.value)}
                placeholder="e.g. Manchester, Leeds"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Comma-separated. Both are required — be specific with areas (a town or city works better than a whole
            county or region).
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={savePending}>
              {savePending ? "Saving…" : "Save niche"}
            </Button>
            {saveStatus === "saved" && <span className="text-xs text-accent">Saved.</span>}
            {saveStatus === "error" && <span className="text-xs text-destructive">Couldn&apos;t save — try again.</span>}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleRun} disabled={runPending || atLimit} className="w-full sm:w-auto">
        {runPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" /> Searching…
          </>
        ) : (
          <>
            <Search className="size-4" /> Find prospects now
          </>
        )}
      </Button>

      {runResult && "error" in runResult && (
        <p className="text-sm text-destructive">{runResult.error}</p>
      )}
      {runResult && "nicheRequired" in runResult && runResult.nicheRequired && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Enter at least one category and one area above before finding prospects.
        </p>
      )}
      {runResult && "billingRequired" in runResult && runResult.billingRequired && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Your trial has ended.{" "}
          <Link href="/studio/billing" className="underline underline-offset-2">
            Subscribe to keep finding prospects
          </Link>
          .
        </p>
      )}
      {runResult && "limitReached" in runResult && runResult.limitReached && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Monthly limit reached ({runResult.limitReached.used} of {runResult.limitReached.limit}) — nothing new
          searched this run.
        </p>
      )}
      {runResult && "inserted" in runResult && !runResult.limitReached && (
        <p className="text-sm text-accent">
          Found {runResult.inserted.length} new prospect{runResult.inserted.length === 1 ? "" : "s"}
          {runResult.skippedDuplicates.length > 0 ? ` (${runResult.skippedDuplicates.length} already known, skipped)` : ""}.
        </p>
      )}

      <div>
        <p className="font-heading text-sm font-semibold">
          Your prospects{prospects.length > 0 ? ` (${prospects.length})` : ""}
        </p>
        {prospects.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No prospects yet — set your niche above and click &quot;Find prospects now.&quot;
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {prospects.map((p) => (
              <ProspectCard key={p.id} prospect={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
