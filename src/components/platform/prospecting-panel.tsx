"use client";

import { useState, useTransition } from "react";
import { Search, ExternalLink, LoaderCircle, CircleAlert, Tag, MapPin, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateProspectingConfig, runDiscovery, convertProspectToClient } from "@/app/studio/(authed)/prospects/actions";
import type { UsageStatus } from "@/lib/usage-limits";

type Prospect = {
  id: string;
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  website: string | null;
  email: string | null;
  status: string;
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

  function handleSave() {
    setSaveStatus("idle");
    startSave(async () => {
      const result = await updateProspectingConfig({
        categories: categories.split(",").map((s) => s.trim()).filter(Boolean),
        areas: areas.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSaveStatus("error" in result ? "error" : "saved");
    });
  }

  function handleRun() {
    setRunResult(null);
    startRun(async () => {
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
          <p className="mt-2 text-xs text-muted-foreground">Comma-separated. Leave blank to use sensible defaults.</p>
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
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.category, p.neighbourhood].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.website && (
                      <a
                        href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-accent"
                        aria-label={`Visit ${p.business_name}'s website`}
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    {p.status !== "converted" && (
                      <Badge variant="secondary" className="capitalize">
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                    )}
                    <ConvertToClientControl prospect={p} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
