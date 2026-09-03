"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Search,
  Tag,
  MapPin,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Sparkles,
  WandSparkles,
  CirclePlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateProspectingConfig,
  runDiscovery,
  searchProspects,
  generateIcp,
  markProspectContacted,
  generateSalesKit,
  addManualProspect,
} from "@/app/studio/(authed)/prospects/actions";
import { DiscoveryResultMessage, type DiscoveryResult } from "@/components/platform/discovery-result-message";
import { StudioPageHeader } from "@/components/platform/studio-page-header";
import { UsageLimitMessage } from "@/components/platform/usage-limit-message";
import type { UsageStatus } from "@/lib/usage-limits";
import { leadNeedsFollowUp } from "@/lib/lead-status";
import type { Prospect, ProposalToken, TeamMember } from "./types";
import { ProspectCard } from "./prospect-card";

// DiscoveryResult / DiscoveryResultMessage moved to their own file
// (Studio improvement) — see discovery-result-message.tsx's own comment
// on why (studio-command-palette.tsx now reuses it too, and shouldn't
// have to pull in this whole panel module to get one small component).

// A single client component rather than splitting settings/results/usage
// into three — they all react to the same runDiscovery() call (a fresh
// run changes the usage bar and the results list together), and this is
// still a small enough page that three separate components would just add
// prop-plumbing without buying independent reusability.
export function ProspectingPanel({
  initialCategories,
  initialAreas,
  usage,
  purchasedCredits,
  prospects,
  bookingLink,
  proposalTokens,
  teamMembers,
  currentUserEmail,
}: {
  initialCategories: string[];
  initialAreas: string[];
  usage: UsageStatus | null;
  purchasedCredits: number;
  prospects: Prospect[];
  bookingLink: string | null;
  proposalTokens: ProposalToken[];
  teamMembers: TeamMember[];
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories.join(", "));
  const [areas, setAreas] = useState(initialAreas.join(", "));
  const [savePending, startSave] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Studio big-ticket ("proposal send-and-track workflow") — reduced to
  // the latest row per prospect_id. proposalTokens arrives ordered
  // newest-first (prospects/page.tsx's own query), so the first row seen
  // per id here is already the latest — nothing to compare timestamps
  // against.
  const latestProposalByProspect = useMemo(() => {
    const map = new Map<string, ProposalToken>();
    for (const t of proposalTokens) {
      if (!map.has(t.prospect_id)) map.set(t.prospect_id, t);
    }
    return map;
  }, [proposalTokens]);

  // Real-improvement pass — this page's own real shape, on closer
  // reading, isn't the Command Centre's "9 parallel content types"
  // (tabs was the right fix there); it's one setup form, one ad-hoc
  // search tool, and one list — the list being the actual reason
  // someone opens this page most days. The niche form was permanently
  // pushing that list down even for a returning tenant who configured
  // it once and never needs to see the full form again. Open by
  // default only while nothing's actually saved yet; collapsed once a
  // real niche exists, same established convention as
  // CommandCentreLayoutPanel (and the Clients page's own AI copilot used
  // to before it was retired — see docs/ai-team/DECISIONS.md).
  const [nicheOpen, setNicheOpen] = useState(initialCategories.length === 0 || initialAreas.length === 0);

  const [icpDescription, setIcpDescription] = useState("");
  const [icpPending, startIcp] = useTransition();
  const [icpError, setIcpError] = useState<string | null>(null);
  const [icpNotes, setIcpNotes] = useState<string | null>(null);

  function handleGenerateIcp() {
    setIcpError(null);
    setIcpNotes(null);
    startIcp(async () => {
      const result = await generateIcp(icpDescription);
      if ("error" in result) {
        setIcpError(result.error);
        return;
      }
      // Fills the existing category/area fields rather than saving
      // directly — the AI's interpretation is a starting point to review
      // and edit, not a decision made on the user's behalf.
      setCategories(result.icp.categories.join(", "));
      setAreas(result.icp.areas.join(", "));
      setIcpNotes(result.icp.notes || null);
    });
  }

  const [runPending, startRun] = useTransition();
  const [runResult, setRunResult] = useState<DiscoveryResult | null>(null);

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

  // Purchased top-up credits (schema-prospect-credits.sql) extend the
  // monthly allowance rather than replacing it — discoverLeads() itself
  // already draws on them once the monthly cap is spent, so this button
  // must only actually disable once BOTH are exhausted. Getting this
  // wrong the other way (disabling on monthly usage alone) would leave
  // someone who just bought credits unable to use them from this screen
  // at all.
  const atLimit = usage !== null && !usage.allowed && purchasedCredits <= 0;
  const usingCredits = usage !== null && !usage.allowed && purchasedCredits > 0;

  // Search now — deliberately its own state, not layered onto
  // categories/areas/runResult above: this doesn't read or write the
  // saved niche at all, it's a one-off search for whatever's typed here.
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchPending, startSearch] = useTransition();
  const [searchResult, setSearchResult] = useState<Awaited<ReturnType<typeof searchProspects>> | null>(null);

  function handleSearch() {
    if (!searchLocation.trim()) return;
    setSearchResult(null);
    startSearch(async () => {
      const result = await searchProspects(searchLocation, searchCategory);
      setSearchResult(result);
    });
  }

  // Add a lead manually — real gap, reported live: every prospect above
  // this point comes from AI discovery only. Own state, own transition,
  // same as Search now above — deliberately not layered onto any of the
  // discovery state, since this doesn't call an AI search at all.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualPending, startManual] = useTransition();
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualJustAdded, setManualJustAdded] = useState(false);

  function handleAddManual() {
    if (!manualName.trim()) return;
    setManualError(null);
    setManualJustAdded(false);
    startManual(async () => {
      const result = await addManualProspect({
        businessName: manualName,
        email: manualEmail,
        phone: manualPhone,
        category: manualCategory,
        neighbourhood: manualLocation,
        website: manualWebsite,
      });
      if ("error" in result) {
        setManualError(result.error ?? "Failed to add prospect.");
        return;
      }
      setManualName("");
      setManualEmail("");
      setManualPhone("");
      setManualCategory("");
      setManualLocation("");
      setManualWebsite("");
      setManualJustAdded(true);
      // Explicit, same reasoning as the bulk actions' own router.refresh()
      // above — this is a brand new row with no per-row optimism of its
      // own to show it instantly, so the real refresh has to be asked for
      // rather than relied on implicitly.
      router.refresh();
    });
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "needs_verification" | "qualified" | "contacted" | "needs_followup" | "converted" | "lost"
  >("all");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">("score");
  // Studio big-ticket ("team collaboration") — only meaningful once
  // there's more than one person on the org, same gate as the assignee
  // select itself.
  const [mineOnly, setMineOnly] = useState(false);

  // Client-side over the full prospect list, not a server round-trip —
  // everything's already loaded for the page, and this is a few dozen
  // rows at most today, not a scale where that trade-off matters yet.
  const visibleProspects = useMemo(() => {
    let list = prospects;
    if (statusFilter === "needs_followup") list = list.filter((p) => leadNeedsFollowUp(p));
    else if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (mineOnly) list = list.filter((p) => p.assigned_to === currentUserEmail);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.business_name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sortBy === "score") sorted.sort((a, b) => (b.score_breakdown?.overall ?? b.score ?? -1) - (a.score_breakdown?.overall ?? a.score ?? -1));
    else if (sortBy === "newest") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sortBy === "name") sorted.sort((a, b) => a.business_name.localeCompare(b.business_name));
    return sorted;
  }, [prospects, search, statusFilter, mineOnly, currentUserEmail, sortBy]);

  // Studio improvement — bulk "mark as contacted" for however many rows
  // are currently selected, calling the exact same markProspectContacted()
  // Server Action ContactTrackingControl already uses per-row, just once
  // per selected id instead of one click at a time. Selection is real ids
  // only (a Set, not "select all prospects" as a separate concept), so a
  // filter/search change that hides a selected row never silently expands
  // what a later bulk action would touch.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  // Studio improvement — bulk "generate outreach kits," same selection
  // set as bulk mark-contacted above, own pending/error/done state (a
  // real AI call per id, not a plain DB write, so it shouldn't share
  // bulkPending's "Updating…" wording or block on it). Capped, unlike
  // mark-contacted: each one is a real, costed Anthropic call, so a
  // selection larger than MAX_BULK_KITS disables the button rather than
  // firing a burst that would just fail most of the way through
  // generateSalesKit()'s own per-call usage/rate-limit check anyway — a
  // hard cap here is a better experience than a mostly-failed batch.
  // Sequential, not Promise.all, for the same reason: a burst of N
  // simultaneous calls is exactly what isStudioActionRateLimited()
  // exists to catch, so this paces itself instead of triggering it.
  const MAX_BULK_KITS = 5;
  const [kitsPending, startKits] = useTransition();
  const [kitsError, setKitsError] = useState<string | null>(null);
  const [kitsDone, setKitsDone] = useState<number | null>(null);
  const [kitsProgress, setKitsProgress] = useState<{ done: number; total: number } | null>(null);

  const visibleSelectedCount = visibleProspects.filter((p) => selected.has(p.id)).length;
  const allVisibleSelected = visibleProspects.length > 0 && visibleSelectedCount === visibleProspects.length;

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const p of visibleProspects) next.delete(p.id);
      } else {
        for (const p of visibleProspects) next.add(p.id);
      }
      return next;
    });
  }

  function bulkMarkContacted() {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkPending) return;
    setBulkError(null);
    setBulkDone(null);
    startBulk(async () => {
      const results = await Promise.all(ids.map((id) => markProspectContacted(id)));
      const failed = results.filter((r) => r && "error" in r).length;
      setSelected(new Set());
      if (failed > 0) {
        setBulkError(`${failed} of ${ids.length} failed to update — try again for those.`);
      }
      setBulkDone(ids.length - failed);
      // Explicit, unlike ContactTrackingControl's own per-row action —
      // that control has its own useOptimistic local state to show the
      // change instantly regardless; this bulk bar has no such per-row
      // optimism (it's driving N rows' worth of ProspectCard/
      // ContactTrackingControl state it doesn't own), so it needs the
      // real refresh itself rather than relying on one to happen
      // implicitly.
      router.refresh();
    });
  }

  function bulkGenerateKits() {
    const ids = Array.from(selected).slice(0, MAX_BULK_KITS);
    if (ids.length === 0 || kitsPending) return;
    setKitsError(null);
    setKitsDone(null);
    setKitsProgress({ done: 0, total: ids.length });
    startKits(async () => {
      let failed = 0;
      for (const id of ids) {
        const r = await generateSalesKit(id);
        if (r && "error" in r) failed++;
        setKitsProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : prev));
      }
      setSelected(new Set());
      setKitsProgress(null);
      if (failed > 0) setKitsError(`${failed} of ${ids.length} kits failed to generate — try those individually.`);
      setKitsDone(ids.length - failed);
      router.refresh();
    });
  }

  return (
    // Centered as one column (mx-auto), not just capped — capping alone
    // (the previous attempt) left the same content flush against the left
    // edge of a much wider main, with all the leftover space dumped on
    // the right: still visibly "off centre," just a smaller gap. A
    // header/nav that spans full width with a centered, moderate-width
    // body column below is the standard SaaS shape (Stripe, Linear,
    // GitHub settings all do this) — the mismatch was never "header wide,
    // body narrow," it was "body narrow AND left-aligned instead of
    // centered."
    <div className="mx-auto max-w-4xl space-y-6">
      <StudioPageHeader
        eyebrow="Grow"
        title="Prospects"
        description="Set your niche and geography, then find real businesses matching it — the same engine HamishAI runs its own weekly search on."
      />

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
            {usingCredits && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                <Sparkles className="size-3.5 shrink-0" />
                Monthly allowance used — {purchasedCredits} purchased prospect{purchasedCredits === 1 ? "" : "s"} available and will be
                used automatically.
              </p>
            )}
            {atLimit && (
              <div className="mt-2">
                <UsageLimitMessage used={usage.used} limit={usage.limit} suffix="to keep finding prospects this month" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <button
            type="button"
            onClick={() => setNicheOpen((o) => !o)}
            aria-expanded={nicheOpen}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">Your niche</p>
              {!nicheOpen && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {categories || "No categories set"} · {areas || "No areas set"}
                </p>
              )}
            </div>
            {nicheOpen ? (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {nicheOpen && (
            <>
          <p className="mt-4 font-heading text-sm font-semibold">Describe your ideal customer</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One sentence is enough — it fills in the fields below for you to review before saving.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
            <Textarea
              value={icpDescription}
              onChange={(e) => setIcpDescription(e.target.value)}
              placeholder="e.g. Independent gyms and fitness studios across Kent's main towns, no chains."
              className="min-h-9 flex-1 text-sm"
              rows={2}
            />
            <Button size="sm" variant="outline" onClick={handleGenerateIcp} disabled={icpPending || !icpDescription.trim()} className="shrink-0">
              {icpPending ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  <WandSparkles className="size-3.5" /> Generate
                </>
              )}
            </Button>
          </div>
          {icpError && <p className="mt-2 text-xs text-destructive">{icpError}</p>}
          {icpNotes && <p className="mt-2 text-xs text-accent">{icpNotes}</p>}

          <p className="mt-5 font-heading text-sm font-semibold">Categories &amp; areas</p>
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
            </>
          )}
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

      {runResult && <DiscoveryResultMessage result={runResult} />}

      {/* Search now — a real, immediate search for one location (category
          optional), separate from the niche above. "Find prospects now"
          re-runs your *saved* categories/areas through a weekly rotation
          (a few pairs at a time); it can't target one specific place on
          demand, and there was no way to search by location alone. This
          calls searchProspects() directly — one real search, right now,
          for exactly what's typed here — and doesn't touch or require
          the saved niche at all. */}
      <Card>
        <CardContent>
          <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
            <Search className="size-4 text-accent" /> Search now
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            One immediate search for a specific place — category is optional. Doesn&apos;t change your saved niche
            above.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="search-location" className="text-xs">
                <MapPin className="size-3" /> Location
              </Label>
              <Input
                id="search-location"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="e.g. Manchester"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-category" className="text-xs">
                <Tag className="size-3" /> Category <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="search-category"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                placeholder="e.g. Gyms — leave blank for any business"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={searchPending || atLimit || !searchLocation.trim()}
            className="mt-4 w-full sm:w-auto"
          >
            {searchPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Searching…
              </>
            ) : (
              <>
                <Search className="size-4" /> Search now
              </>
            )}
          </Button>
          {searchResult && (
            <div className="mt-3">
              <DiscoveryResultMessage result={searchResult} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add a lead manually — real gap, reported live: everything above
          this card only ever creates a prospect through AI discovery.
          A tenant's own inbound enquiry, referral, or trade-show contact
          had nowhere to go. Collapsed by default (nicheOpen's own
          convention) — this is a secondary path, not the page's main
          flow, and shouldn't permanently push the actual prospect list
          down for every tenant who never uses it. */}
      <Card>
        <CardContent>
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-1.5 font-heading text-sm font-semibold">
              <CirclePlus className="size-4 text-accent" /> Add a lead manually
            </span>
            {manualOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
          {!manualOpen && (
            <p className="mt-1 text-xs text-muted-foreground">
              Got a lead that didn&apos;t come from a search — a referral, an enquiry, someone you met? Add it here
              and it joins the same pipeline as everything else.
            </p>
          )}
          {manualOpen && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Not researched or scored automatically — this is a lead you&apos;re vouching for yourself. You can
                still run research on it afterwards from its card below.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="manual-name" className="text-xs">
                    Business name
                  </Label>
                  <Input
                    id="manual-name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Riverside Cafe"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-email" className="text-xs">
                    <Mail className="size-3" /> Email <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="manual-email"
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-phone" className="text-xs">
                    <Phone className="size-3" /> Phone <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="manual-phone"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="e.g. 0131 xxx xxxx"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-category" className="text-xs">
                    <Tag className="size-3" /> Category <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="manual-category"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="e.g. Gym"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-location" className="text-xs">
                    <MapPin className="size-3" /> Location <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="manual-location"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="e.g. Leith"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="manual-website" className="text-xs">
                    Website <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="manual-website"
                    value={manualWebsite}
                    onChange={(e) => setManualWebsite(e.target.value)}
                    placeholder="https://…"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              {manualError && <p className="text-xs text-destructive">{manualError}</p>}
              {manualJustAdded && <p className="text-xs text-success">Added to your prospects below.</p>}
              <Button onClick={handleAddManual} disabled={manualPending || !manualName.trim()} size="sm">
                {manualPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" /> Adding…
                  </>
                ) : (
                  <>
                    <CirclePlus className="size-4" /> Add lead
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading text-sm font-semibold">
            Your prospects{prospects.length > 0 ? ` (${visibleProspects.length}${visibleProspects.length !== prospects.length ? ` of ${prospects.length}` : ""})` : ""}
          </p>
          {prospects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="h-8 w-40 text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="Filter by status"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All statuses</option>
                <option value="needs_verification">Needs verification</option>
                <option value="qualified">Qualified</option>
                <option value="contacted">Contacted</option>
                <option value="needs_followup">Follow-up due</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort prospects by"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="score">Highest score</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
              </select>
              {teamMembers.length > 1 && (
                <Button size="sm" variant={mineOnly ? "secondary" : "ghost"} onClick={() => setMineOnly((v) => !v)}>
                  Assigned to me
                </Button>
              )}
            </div>
          )}
        </div>
        {prospects.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No prospects yet — set your niche above and click &quot;Find prospects now.&quot;
          </div>
        ) : visibleProspects.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No prospects match that search or filter.
          </div>
        ) : (
          <>
            {/* Studio improvement — bulk actions. Only shown once there's a
                real list to select from (visibleProspects.length > 0 is
                already guaranteed by this branch); the bar itself only
                appears once something's actually selected, same "don't
                show controls for a state that isn't real yet" rule as the
                rest of this page. */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                aria-label="Select all visible prospects"
                className="size-4 shrink-0 rounded border-border accent-accent"
              />
              <span>Select all {visibleProspects.length}</span>
              {selected.size > 0 && (
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  <span>{selected.size} selected</span>
                  <Button size="xs" variant="outline" disabled={bulkPending} onClick={bulkMarkContacted}>
                    {bulkPending ? "Updating…" : `Mark ${selected.size} as contacted`}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={kitsPending || selected.size > MAX_BULK_KITS}
                    onClick={bulkGenerateKits}
                    title={selected.size > MAX_BULK_KITS ? `Select ${MAX_BULK_KITS} or fewer to generate kits in bulk` : undefined}
                  >
                    {kitsPending
                      ? kitsProgress
                        ? `Generating ${kitsProgress.done}/${kitsProgress.total}…`
                        : "Generating…"
                      : `Generate ${Math.min(selected.size, MAX_BULK_KITS)} outreach kit${Math.min(selected.size, MAX_BULK_KITS) === 1 ? "" : "s"}`}
                  </Button>
                </span>
              )}
            </div>
            {selected.size > MAX_BULK_KITS && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Only the first {MAX_BULK_KITS} selected can have outreach kits generated at once — real AI calls, one per prospect.
              </p>
            )}
            {bulkDone !== null && !bulkPending && (
              <p className="mt-1.5 text-xs text-accent">
                {bulkDone} prospect{bulkDone === 1 ? "" : "s"} marked as contacted.
              </p>
            )}
            {bulkError && <p className="mt-1.5 text-xs text-destructive">{bulkError}</p>}
            {kitsDone !== null && !kitsPending && (
              <p className="mt-1.5 text-xs text-accent">
                {kitsDone} outreach kit{kitsDone === 1 ? "" : "s"} generated.
              </p>
            )}
            {kitsError && <p className="mt-1.5 text-xs text-destructive">{kitsError}</p>}
            <div className="mt-2 space-y-2">
              {visibleProspects.map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  selected={selected.has(p.id)}
                  onToggleSelect={() => toggleSelected(p.id)}
                  bookingLink={bookingLink}
                  proposalToken={latestProposalByProspect.get(p.id) ?? null}
                  teamMembers={teamMembers}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
