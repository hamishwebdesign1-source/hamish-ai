import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ExternalLink, Search, X, Clock, Mail, Phone, MessageCircleReply, Sparkles, FileX, AlertTriangle, Zap, ArrowRight, TrendingUp, Flame, FileCheck2, Hourglass, CalendarClock } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkGoogleConnection } from "@/lib/check-google-connection";
import { checkMsConnection } from "@/lib/check-ms-connection";
import { logAuditEvent } from "@/lib/audit-log";
import { leadNeedsFollowUp as needsFollowUp, getLeadCadenceAction, EMAIL_TO_CALL_DAYS } from "@/lib/lead-status";
import { STATUSES, statusMeta, isStaleLead, daysSince, websiteHref } from "@/lib/lead-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactBadge } from "@/components/admin/contact-badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { cn } from "@/lib/utils";

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

async function addLead(formData: FormData) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const businessName = String(formData.get("business_name") || "");
  const { data: inserted, error } = await supabase
    .from("prospects")
    .insert({
      business_name: businessName,
      category: String(formData.get("category") || "") || null,
      neighbourhood: String(formData.get("neighbourhood") || "") || null,
      website: String(formData.get("website") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      score: formData.get("score") ? Number(formData.get("score")) : null,
      signal: String(formData.get("signal") || "") || null,
      outreach_note: String(formData.get("outreach_note") || "") || null,
      status: String(formData.get("status") || "needs_verification"),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert lead:", error);
  } else if (inserted) {
    await logAuditEvent({
      actor: "admin",
      action: "lead.created",
      targetType: "prospect",
      targetId: inserted.id,
      metadata: { business_name: businessName },
    });
  }

  revalidatePath("/admin/leads");
}

type NextActionReason = "call" | "follow_up" | "send" | "build_concept" | "verify";

// The most useful things to do next, instead of making the operator scan
// the list and combine filters themselves. Walks the same priority tiers
// as before (overdue call/follow-up beats everything time-sensitive, then
// ready-with-concept, then ready-needs-concept, then needs-verification)
// but now collects up to `limit` distinct leads across those tiers rather
// than stopping at the first match — a top-5 queue, not a single pick.
// `allLeads` is already sorted concept-first/score-desc, so each tier's
// scan naturally surfaces its strongest matches first.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickNextActions(allLeads: any[] | null | undefined, limit = 5): { lead: any; reason: NextActionReason }[] {
  if (!allLeads?.length) return [];
  const tiers: { match: (l: any) => boolean; reason: NextActionReason }[] = [
    { match: (l) => getLeadCadenceAction(l) === "call", reason: "call" },
    { match: (l) => getLeadCadenceAction(l) === "follow_up", reason: "follow_up" },
    { match: (l) => l.status === "ready" && Boolean(l.concept_slug), reason: "send" },
    { match: (l) => l.status === "ready" && !l.concept_slug, reason: "build_concept" },
    { match: (l) => l.status === "needs_verification", reason: "verify" },
  ];
  const seen = new Set<string>();
  const results: { lead: any; reason: NextActionReason }[] = [];
  for (const tier of tiers) {
    for (const lead of allLeads) {
      if (results.length >= limit) return results;
      if (seen.has(lead.id) || !tier.match(lead)) continue;
      seen.add(lead.id);
      results.push({ lead, reason: tier.reason });
    }
  }
  return results;
}

const nextActionCopy: Record<NextActionReason, (l: { business_name: string }) => string> = {
  call: (l) => `${l.business_name} is due a follow-up call — it's been ${EMAIL_TO_CALL_DAYS}+ days since the email, no reply yet.`,
  follow_up: (l) => `One last follow-up for ${l.business_name} before parking it.`,
  send: (l) => `${l.business_name} has a concept page ready to go — send it.`,
  build_concept: (l) => `${l.business_name} is ready for outreach but has no concept page yet.`,
  verify: (l) => `${l.business_name} needs a quick manual check before it's outreach-ready.`,
};

const SORT_LABELS: Record<string, string> = {
  priority: "Concept-first",
  score: "Highest score",
  recent: "Most recent",
  az: "A–Z",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortLeads(list: any[], sortKey: string): any[] {
  const copy = [...list];
  switch (sortKey) {
    case "score":
      return copy.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    case "recent":
      return copy.sort(
        (a, b) => new Date(b.found_at ?? b.created_at ?? 0).getTime() - new Date(a.found_at ?? a.created_at ?? 0).getTime()
      );
    case "az":
      return copy.sort((a, b) => String(a.business_name).localeCompare(String(b.business_name)));
    default:
      return copy; // already in the default concept-first/score-desc order
  }
}

// High Impact #9 from docs/leads-automation-plan.md — pipeline widgets
// built entirely from the fields #6-8 already added (research, score,
// sales_kit), zero extra LLM cost: pure JS filters over the same
// already-fetched `allLeads` array everything else on this page reads.
// "Follow-up today" isn't here — it's the existing needsFollowUp/
// getLeadCadenceAction check, already surfaced as its own stat card and
// ?status=needs_followup filter above.
const INSIGHT_LABELS: Record<string, string> = {
  high_value: "High value",
  hot: "Hot opportunities",
  ready_for_proposal: "Ready for proposal",
  waiting: "Waiting for customer",
  recently_researched: "Recently researched",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isHighValue(l: any): boolean {
  const band = l.research?.estimated_project_value_band;
  return band === "£6,000+" || band === "£3,000-£6,000";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isHotOpportunity(l: any): boolean {
  return l.research?.conversion_probability_band === "high";
}

// Contacted and they've actually replied — the next step is a proposal,
// not another chase email.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isReadyForProposal(l: any): boolean {
  return l.status === "contacted" && Boolean(l.replied_at);
}

// Contacted, no reply yet, but still inside the normal cadence window —
// leadNeedsFollowUp(l) is what flags it once that window's up, so this
// deliberately excludes those to avoid double-counting the same lead
// under two different pipeline widgets.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isWaitingForCustomer(l: any): boolean {
  return l.status === "contacted" && !l.replied_at && !needsFollowUp(l);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRecentlyResearched(l: any): boolean {
  return Boolean(l.research_generated_at) && daysSince(l.research_generated_at) <= 7;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const INSIGHT_PREDICATES: Record<string, (l: any) => boolean> = {
  high_value: isHighValue,
  hot: isHotOpportunity,
  ready_for_proposal: isReadyForProposal,
  waiting: isWaitingForCustomer,
  recently_researched: isRecentlyResearched,
};

const INSIGHT_ICONS: Record<string, typeof TrendingUp> = {
  high_value: TrendingUp,
  hot: Flame,
  ready_for_proposal: FileCheck2,
  waiting: Hourglass,
  recently_researched: Sparkles,
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; contacted?: string; concept?: string; insight?: string; q?: string; sort?: string }>;
}) {
  const {
    status: statusFilter,
    contacted: contactedFilter,
    concept: conceptFilter,
    insight: insightFilter,
    q: searchQuery,
    sort: sortKey = "priority",
  } = await searchParams;
  const supabase = getSupabaseAdmin();

  // Run alongside the leads fetch, not after it — a live Google API call
  // adds real latency, so it shouldn't be paid twice. The audit-log fetch
  // doesn't depend on which lead IDs exist (fetched unconditionally,
  // bounded, grouped client-side below) specifically so it can run in the
  // same batch instead of waiting on the leads query first.
  const [{ data: fetchedLeads, error }, googleStatus, msStatus, { data: auditRows }, { data: meetingRows }] = await Promise.all([
    supabase
      ? supabase.from("prospects").select("*").order("score", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    checkGoogleConnection(),
    checkMsConnection(),
    supabase
      ? supabase
          .from("audit_log")
          .select("target_id, action, created_at, metadata")
          .eq("target_type", "prospect")
          .order("created_at", { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: [] }),
    // Only ever the *next* scheduled meeting per lead is shown on the card
    // (see meetingByLead below) — ascending order means the first row seen
    // per prospect_id while grouping is always the soonest one.
    supabase
      ? supabase
          .from("lead_meetings")
          .select("prospect_id, scheduled_start, join_url")
          .eq("status", "scheduled")
          .order("scheduled_start", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);
  if (error) console.error("Failed to fetch leads:", error);

  // Grouped once, read many times below (the timeline per card, and the
  // "last touched" date the stale-lead badge is computed from).
  const auditByLead = new Map<string, { action: string; created_at: string; metadata: Record<string, unknown> | null }[]>();
  for (const row of auditRows ?? []) {
    const list = auditByLead.get(row.target_id) ?? [];
    list.push(row);
    auditByLead.set(row.target_id, list);
  }

  const meetingByLead = new Map<string, { joinUrl: string; scheduledStart: string }>();
  for (const row of meetingRows ?? []) {
    if (!meetingByLead.has(row.prospect_id)) {
      meetingByLead.set(row.prospect_id, { joinUrl: row.join_url, scheduledStart: row.scheduled_start });
    }
  }

  // Leads with a real, built concept page (see /concepts/[slug]) are the
  // strongest thing to lead outreach with — always surface them first,
  // regardless of score; score still breaks ties within each group.
  const allLeads = fetchedLeads
    ? [...fetchedLeads].sort((a, b) => {
        const aHasConcept = a.concept_slug ? 1 : 0;
        const bHasConcept = b.concept_slug ? 1 : 0;
        if (aHasConcept !== bHasConcept) return bHasConcept - aHasConcept;
        return (b.score ?? -1) - (a.score ?? -1);
      })
    : fetchedLeads;

  const nextActions = pickNextActions(allLeads);

  // Larger Feature #10 — leads the weekly discovery cron added, surfaced
  // as a fast batch-review queue distinct from "Do this next" above (which
  // reasons over the whole pipeline, not just what's new). Approve/reject
  // reuses the existing status buttons already on each card below — no new
  // interaction pattern, just a shortcut to the right ones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newlyDiscovered = (allLeads ?? []).filter((l: any) => l.discovery_source && daysSince(l.found_at ?? l.created_at) <= 7);

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: allLeads?.filter((l) => l.status === s).length ?? 0 }),
    {} as Record<string, number>
  );
  const followUpCount = allLeads?.filter(needsFollowUp).length ?? 0;
  const contactedCount = allLeads?.filter((l) => l.status === "contacted").length ?? 0;
  const notContactedCount = (allLeads?.length ?? 0) - contactedCount;
  const hasConceptCount = allLeads?.filter((l) => l.concept_slug).length ?? 0;
  const noConceptCount = (allLeads?.length ?? 0) - hasConceptCount;

  // Pipeline widget counts — see INSIGHT_PREDICATES above.
  const insightCounts: Record<string, number> = Object.fromEntries(
    Object.keys(INSIGHT_LABELS).map((key) => [key, allLeads?.filter(INSIGHT_PREDICATES[key]).length ?? 0])
  );

  // Four independent filter dimensions that AND together (status,
  // contacted/not, concept-built/not, pipeline insight) rather than one
  // combined enum — lets you ask e.g. "ready AND no concept yet" in one
  // view, which is the actual question when deciding what to build next.
  let leads =
    statusFilter === "needs_followup"
      ? allLeads?.filter(needsFollowUp)
      : statusFilter
        ? allLeads?.filter((l) => l.status === statusFilter)
        : allLeads;
  if (contactedFilter === "yes") leads = leads?.filter((l) => l.status === "contacted");
  else if (contactedFilter === "no") leads = leads?.filter((l) => l.status !== "contacted");
  if (conceptFilter === "yes") leads = leads?.filter((l) => Boolean(l.concept_slug));
  else if (conceptFilter === "no") leads = leads?.filter((l) => !l.concept_slug);
  if (insightFilter && INSIGHT_PREDICATES[insightFilter]) leads = leads?.filter(INSIGHT_PREDICATES[insightFilter]);

  // Free-text search — business name, category, neighbourhood, website,
  // and email, so "who did I already look at in Falkirk" or "find the
  // joiners" both work. Combines with the three filter dimensions above
  // rather than replacing them.
  const trimmedQuery = searchQuery?.trim().toLowerCase();
  if (trimmedQuery) {
    leads = leads?.filter((l) =>
      [l.business_name, l.category, l.neighbourhood, l.website, l.email]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(trimmedQuery))
    );
  }

  // Re-sort for display only — allLeads/pickNextActions() above always
  // reason over the default concept-first/score-desc order regardless of
  // what the operator has this list currently sorted by.
  if (leads && sortKey !== "priority") leads = sortLeads(leads, sortKey);

  // Builds a filter-pill href that preserves the other active dimensions
  // (including the current search query) — clicking one pill, or
  // submitting a search, shouldn't reset the others. Pass `undefined` for
  // a dimension to clear it back to "All"/empty.
  function filterHref(overrides: { status?: string; contacted?: string; concept?: string; insight?: string; q?: string; sort?: string }) {
    const next = {
      status: statusFilter,
      contacted: contactedFilter,
      concept: conceptFilter,
      insight: insightFilter,
      q: searchQuery,
      sort: sortKey === "priority" ? undefined : sortKey,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.contacted) params.set("contacted", next.contacted);
    if (next.concept) params.set("concept", next.concept);
    if (next.insight) params.set("insight", next.insight);
    if (next.q) params.set("q", next.q);
    if (next.sort) params.set("sort", next.sort);
    const qs = params.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Central Belt of Scotland business prospects — researched weekly and worked through to outreach from here.
      </p>

      {!googleStatus.connected && (
        <Card className="mt-6 border-warning/30 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                <strong className="font-medium">Gmail isn&apos;t connected right now</strong> — drafting, &ldquo;Check
                if sent&rdquo;, and the daily send-check will silently fail until this is fixed. Use the manual
                &ldquo;Sent&rdquo; checkbox or copy a draft to send some other way in the meantime.
                <span className="mt-1 block text-xs text-muted-foreground">{googleStatus.reason}</span>
              </span>
            </div>
            <Link href="/admin/google-setup" className="shrink-0">
              <Button type="button" variant="outline" size="sm">
                Reconnect
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!msStatus.connected && (
        <Card className="mt-6 border-warning/30 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                <strong className="font-medium">Microsoft isn&apos;t connected</strong> — &ldquo;Schedule Teams
                meeting&rdquo; won&apos;t work until this is set up.
                <span className="mt-1 block text-xs text-muted-foreground">{msStatus.reason}</span>
              </span>
            </div>
            <Link href="/admin/ms-setup" className="shrink-0">
              <Button type="button" variant="outline" size="sm">
                Connect
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Top 5 highest-priority actions, computed by pickNextActions() above
          — the point is to remove the "scan the list and combine filters
          yourself" step for the common case of "what should I actually do
          right now". */}
      {nextActions.length > 0 && (
        <Card className="mt-6 border-accent/30 bg-accent/5">
          <CardContent className="py-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] text-accent uppercase">
              <Zap className="size-3.5" />
              Do this next
            </p>
            <ul className="mt-2 divide-y divide-accent/15">
              {nextActions.map(({ lead, reason }) => (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span>{nextActionCopy[reason](lead)}</span>
                  {/* Always the unfiltered view, not filterHref() — an
                      active filter could exclude this exact lead, and the
                      anchor only exists on the page it's actually rendered on. */}
                  <a href={`/admin/leads#lead-${lead.id}`} className="shrink-0">
                    <Button type="button" variant="outline" size="xs" className="gap-1">
                      Jump to it
                      <ArrowRight className="size-3" />
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Leads the weekly discovery cron added — a fast batch-review queue,
          separate from "Do this next" above. "Review" opens the lead's own
          page, where status/verify actions now live (portal redesign
          Stage 4 — the list page is a scan surface, not an edit surface). */}
      {newlyDiscovered.length > 0 && (
        <Card className="mt-6 border-accent/30 bg-accent/5">
          <CardContent className="py-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] text-accent uppercase">
              <Sparkles className="size-3.5" />
              New this week ({newlyDiscovered.length})
            </p>
            <ul className="mt-2 divide-y divide-accent/15">
              {newlyDiscovered.map((lead) => (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span>
                    {lead.business_name} ({lead.category}, {lead.neighbourhood})
                    {lead.discovery_source?.why_suggested && (
                      <span className="text-muted-foreground"> — {lead.discovery_source.why_suggested}</span>
                    )}
                  </span>
                  <a href={`/admin/leads#lead-${lead.id}`} className="shrink-0">
                    <Button type="button" variant="outline" size="xs" className="gap-1">
                      Review
                      <ArrowRight className="size-3" />
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* GET form, not a client component — keeps this page a plain server
          component like the rest of the file. Hidden inputs carry the
          three filter dimensions through so searching doesn't reset them. */}
      <form action="/admin/leads" className="mt-6 flex items-center gap-2">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {contactedFilter && <input type="hidden" name="contacted" value={contactedFilter} />}
        {conceptFilter && <input type="hidden" name="concept" value={conceptFilter} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={searchQuery ?? ""}
            placeholder="Search by name, category, neighbourhood, website, or email…"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {trimmedQuery && (
          <Link href={filterHref({ q: undefined })}>
            <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground">
              <X className="size-4" />
            </Button>
          </Link>
        )}
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{allLeads?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total checked</p>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s} className="p-4">
            <p className="font-heading text-2xl font-semibold">{counts[s]}</p>
            <p className="text-xs text-muted-foreground">{statusMeta[s].label}</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{followUpCount}</p>
          <p className="text-xs text-muted-foreground">Needs follow-up</p>
        </Card>
      </div>

      {/* One grouped panel instead of five loose, independently-floating
          filter rows — same four independent "AND together" dimensions
          (status, contacted, concept page, pipeline) plus sort, but framed
          as a single filter control instead of a stack of unrelated-looking
          chip rows. */}
      <div className="mt-6 space-y-2 rounded-xl border border-border bg-card/50 p-3">
        <FilterTabs
          activeKey={statusFilter}
          options={[
            { key: undefined, label: "All", href: filterHref({ status: undefined }) },
            ...STATUSES.map((s) => ({ key: s, label: statusMeta[s].label, href: filterHref({ status: s }) })),
            { key: "needs_followup", label: "Needs follow-up", icon: Clock, href: filterHref({ status: "needs_followup" }) },
          ]}
        />

        {/* Contacted / not contacted — independent of the status pills
            above, so it can combine with them (e.g. "Ready" + "Not
            contacted"). */}
        <FilterTabs
          label="Contact"
          activeKey={contactedFilter}
          options={[
            { key: undefined, label: "All", count: allLeads?.length ?? 0, href: filterHref({ contacted: undefined }) },
            { key: "no", label: "Not contacted", count: notContactedCount, icon: Mail, href: filterHref({ contacted: "no" }) },
            { key: "yes", label: "Contacted", count: contactedCount, icon: MessageCircleReply, href: filterHref({ contacted: "yes" }) },
          ]}
        />

        {/* Concept page built / not — same independence, so you can filter
            e.g. "Ready for outreach" + "No concept yet" to see exactly who
            to build a concept page for next. */}
        <FilterTabs
          label="Concept"
          activeKey={conceptFilter}
          options={[
            { key: undefined, label: "All", count: allLeads?.length ?? 0, href: filterHref({ concept: undefined }) },
            { key: "no", label: "No concept yet", count: noConceptCount, icon: FileX, href: filterHref({ concept: "no" }) },
            { key: "yes", label: "Concept made", count: hasConceptCount, icon: Sparkles, href: filterHref({ concept: "yes" }) },
          ]}
        />

        {/* Pipeline widgets (High Impact #9) — pure JS filters over the
            research/score fields #6-8 added, zero LLM cost. Independent of
            the three dimensions above, same "AND together" pattern. */}
        <FilterTabs
          label="Pipeline"
          activeKey={insightFilter}
          options={[
            { key: undefined, label: "All", href: filterHref({ insight: undefined }) },
            ...Object.entries(INSIGHT_LABELS).map(([key, label]) => ({
              key,
              label,
              count: insightCounts[key],
              icon: INSIGHT_ICONS[key],
              href: filterHref({ insight: key }),
            })),
          ]}
        />

        {/* Display order only — doesn't touch the "Do this next" card
            above, which always reasons over the default priority order
            regardless of how the list below is currently sorted. Now the
            same FilterTabs control as everything else in this panel,
            rather than a differently-styled hand-rolled row. */}
        <FilterTabs
          label="Sort"
          activeKey={sortKey === "priority" ? undefined : sortKey}
          options={Object.entries(SORT_LABELS).map(([key, label]) => ({
            key: key === "priority" ? undefined : key,
            label,
            href: filterHref({ sort: key === "priority" ? undefined : key }),
          }))}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addLead} className="mt-2 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name</Label>
                <Input id="business_name" name="business_name" placeholder="Orinoco Latin Food" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Restaurant" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="neighbourhood">Neighbourhood</Label>
                <Input id="neighbourhood" name="neighbourhood" placeholder="Leith Walk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="example.co.uk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Contact email</Label>
                <Input id="email" name="email" type="email" placeholder="hello@example.co.uk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Contact number</Label>
                <Input id="phone" name="phone" type="tel" placeholder="0131 123 4567" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="score">Score (0–5)</Label>
                <select id="score" name="score" defaultValue="" className={selectClasses}>
                  <option value="">Not scored</option>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signal">Signal found</Label>
                <Textarea id="signal" name="signal" placeholder="What's the concrete, specific finding?" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outreach_note">Outreach note</Label>
                <Textarea id="outreach_note" name="outreach_note" placeholder="Opening line / context for reaching out." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue="needs_verification" className={selectClasses}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusMeta[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                Add lead
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {!leads?.length && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Search className="size-6 text-muted-foreground/60" />
                No leads in this view yet.
              </CardContent>
            </Card>
          )}
          <ul className="space-y-3">
            {leads?.map((lead) => {
              const meeting = meetingByLead.get(lead.id);
              return (
                <li
                  key={lead.id}
                  id={`lead-${lead.id}`}
                  className="group relative scroll-mt-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40"
                >
                  {/* Stretched-link pattern — the whole card is a click
                      target for the lead detail page, but it's a sibling
                      of the content below (not a wrapper), so the website
                      link inside can still be its own real, separately
                      clickable anchor. */}
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="absolute inset-0 z-0 rounded-xl"
                    aria-label={`Open ${lead.business_name}`}
                  />

                  <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{lead.business_name}</p>
                        {lead.discovery_source && (
                          <Badge variant="ai" className="gap-1">
                            <Sparkles className="size-3" />
                            AI
                          </Badge>
                        )}
                        {isStaleLead(lead, auditByLead.get(lead.id)) && (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="size-3" />
                            Stale — 30+ days
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[lead.category, lead.neighbourhood].filter(Boolean).join(" · ")}
                        {lead.website && (
                          <>
                            {" · "}
                            <a
                              href={websiteHref(lead.website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative z-10 inline-flex items-center gap-0.5 text-accent hover:underline"
                            >
                              {lead.website}
                              <ExternalLink className="size-3" />
                            </a>
                          </>
                        )}
                      </p>
                      {/* Actual contact details, not just the cadence badge
                          (ContactBadge says *when* you last touched them,
                          not *how to reach them* — brought back after
                          feedback that the card had gone too scan-only to
                          be useful on its own). */}
                      {(lead.email || lead.phone) && (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="relative z-10 inline-flex items-center gap-1 hover:text-accent hover:underline"
                            >
                              <Mail className="size-3" />
                              {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                              className="relative z-10 inline-flex items-center gap-1 hover:text-accent hover:underline"
                            >
                              <Phone className="size-3" />
                              {lead.phone}
                            </a>
                          )}
                        </p>
                      )}
                      {(lead.research?.pursue_because || lead.outreach_note) && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground italic">
                          <Sparkles className="mt-0.5 size-3 shrink-0 text-[var(--gradient-violet)]" />
                          &ldquo;{lead.research?.pursue_because ?? lead.outreach_note}&rdquo;
                        </p>
                      )}
                      {/* A one-line taste of the research findings, not the
                          full breakdown (that stays on the detail page) —
                          enough to judge relevance without a click. */}
                      {lead.research?.weaknesses && lead.research.weaknesses.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Weak spots: </span>
                          {lead.research.weaknesses.slice(0, 2).join(" · ")}
                        </p>
                      )}
                      {lead.research?.ai_opportunities && lead.research.ai_opportunities.length > 0 && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Zap className="mt-0.5 size-3 shrink-0 text-accent" />
                          {lead.research.ai_opportunities[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={statusMeta[lead.status as keyof typeof statusMeta]?.variant ?? "secondary"}>
                        {statusMeta[lead.status as keyof typeof statusMeta]?.label ?? lead.status}
                      </Badge>
                      <ContactBadge lead={lead} />
                    </div>
                  </div>

                  <div className="relative z-10 mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {lead.score != null && (
                      <div className="flex items-center gap-0.5" title={`Score: ${lead.score}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={cn("size-1.5 rounded-full", n <= lead.score ? "bg-accent" : "bg-border")}
                          />
                        ))}
                      </div>
                    )}
                    {lead.research?.estimated_project_value_band && (
                      <span>Est. {lead.research.estimated_project_value_band}</span>
                    )}
                    {lead.research?.conversion_probability_band && (
                      <span>Conversion: {lead.research.conversion_probability_band}</span>
                    )}
                    {meeting && (
                      <span className="inline-flex items-center gap-1 text-accent">
                        <CalendarClock className="size-3" />
                        {new Date(meeting.scheduledStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
