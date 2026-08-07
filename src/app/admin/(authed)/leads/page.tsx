import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ExternalLink, Search, X, Clock, Phone, PhoneCall, Mail, MessageCircleReply, Sparkles, FileX, AlertTriangle, Zap, ArrowRight, History } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkGoogleConnection } from "@/lib/check-google-connection";
import { logAuditEvent } from "@/lib/audit-log";
import {
  updateLeadStatus,
  deleteLead,
  updateLeadEmail,
  updateLeadPhone,
  updateLeadConceptSlug,
  updateLeadNotes,
  markLeadReplied,
} from "@/app/admin/actions";
import { leadNeedsFollowUp as needsFollowUp, getLeadCadenceAction, EMAIL_TO_CALL_DAYS } from "@/lib/lead-status";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailLeadButton } from "@/components/admin/email-lead-button";
import { CallScriptButton } from "@/components/admin/call-script-button";
import { cn } from "@/lib/utils";

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const STATUSES = ["needs_verification", "ready", "contacted", "not_fit"] as const;

const statusMeta: Record<(typeof STATUSES)[number], { label: string; variant: "warning" | "success" | "accent" | "secondary" }> = {
  needs_verification: { label: "Needs verification", variant: "warning" },
  ready: { label: "Ready for outreach", variant: "success" },
  contacted: { label: "Contacted", variant: "accent" },
  not_fit: { label: "Not a good fit", variant: "secondary" },
};

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

function websiteHref(website: string) {
  return website.startsWith("http") ? website : `https://${website.split(" ")[0]}`;
}

type AuditEntry = { action: string; created_at: string; metadata: Record<string, unknown> | null };

function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// 30+ days with no logged activity, still sitting in one of the two
// "not yet actioned" statuses — everything past that point is either
// contacted, not a fit, or moving fast enough that it isn't stale.
// "Last touched" is the most recent audit_log entry if one exists,
// falling back to when the row was first found.
function isStaleLead(lead: { status: string; created_at: string }, entries: AuditEntry[] | undefined) {
  if (lead.status !== "needs_verification" && lead.status !== "ready") return false;
  const lastTouched = entries?.[0]?.created_at ?? lead.created_at;
  return daysSince(lastTouched) >= 30;
}

// One short, human-readable line per audit_log action — the raw
// "lead.email_drafted" strings are for filtering/analytics, not for
// reading, so the timeline renders a translated version instead.
function describeAuditEntry(entry: AuditEntry): string {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case "lead.created":
      return "Lead added";
    case "lead.status_changed":
      return `Status changed to "${statusMeta[meta.to as keyof typeof statusMeta]?.label ?? meta.to}"`;
    case "lead.called":
      return "Marked as called";
    case "lead.email_marked_sent":
      return "Marked email as sent (manual)";
    case "lead.email_sent_confirmed":
      return `Email send confirmed (${meta.via === "cron_sweep" ? "daily check" : "manual check"})`;
    case "lead.replied":
      return "Marked as replied";
    case "lead.email_drafted":
      return meta.saved_to_gmail ? "Email drafted and saved to Gmail" : "Email drafted (not saved to Gmail)";
    case "lead.call_script_drafted":
      return "Call script drafted";
    case "lead.notes_updated":
      return `Note added: "${meta.notes}"`;
    case "lead.email_updated":
      return meta.email ? `Contact email set to ${meta.email}` : "Contact email cleared";
    case "lead.phone_updated":
      return meta.phone ? `Contact phone set to ${meta.phone}` : "Contact phone cleared";
    case "lead.concept_slug_updated":
      return meta.concept_slug ? `Linked to concept page "${meta.concept_slug}"` : "Concept page link removed";
    default:
      return entry.action;
  }
}

type LeadRow = {
  status: string;
  contacted_at: string | null;
  last_contact_method: string | null;
  replied_at: string | null;
  pending_email_message_id: string | null;
};

// The single badge that tells Hamish, at a glance, exactly where a lead
// sits in the email → wait → call cadence — replied, due a call, due a
// follow-up, or just a quiet "here's the last touch" note.
function ContactBadge({ lead }: { lead: LeadRow }) {
  if (lead.replied_at) {
    return (
      <Badge variant="success" className="gap-1">
        <MessageCircleReply className="size-3" />
        Replied {timeAgo(lead.replied_at)}
      </Badge>
    );
  }

  const action = getLeadCadenceAction(lead);
  if (action === "call") {
    return (
      <Badge variant="warning" className="gap-1">
        <PhoneCall className="size-3" />
        Call now
      </Badge>
    );
  }
  if (action === "follow_up") {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="size-3" />
        Needs follow-up
      </Badge>
    );
  }
  if (lead.status === "contacted" && lead.contacted_at) {
    const wasCall = lead.last_contact_method === "call";
    return (
      <Badge variant="secondary" className="gap-1">
        {wasCall ? <PhoneCall className="size-3" /> : <Mail className="size-3" />}
        {wasCall ? "Called" : "Emailed"} {timeAgo(lead.contacted_at)}
      </Badge>
    );
  }
  if (lead.pending_email_message_id) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Mail className="size-3" />
        Draft pending — not sent yet
      </Badge>
    );
  }
  return null;
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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; contacted?: string; concept?: string; q?: string; sort?: string }>;
}) {
  const {
    status: statusFilter,
    contacted: contactedFilter,
    concept: conceptFilter,
    q: searchQuery,
    sort: sortKey = "priority",
  } = await searchParams;
  const supabase = getSupabaseAdmin();

  // Real, built concept pages only — reading the actual directory instead
  // of hardcoding a list means this never drifts out of date, and turns
  // the old free-text slug field (one typo from a dead link) into a
  // dropdown that can't produce a broken /concepts/<slug> URL.
  let conceptSlugs: string[] = [];
  try {
    conceptSlugs = fs
      .readdirSync(path.join(process.cwd(), "src/app/concepts"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (err) {
    console.error("Failed to list concept pages:", err);
  }

  // Run alongside the leads fetch, not after it — a live Google API call
  // adds real latency, so it shouldn't be paid twice. The audit-log fetch
  // doesn't depend on which lead IDs exist (fetched unconditionally,
  // bounded, grouped client-side below) specifically so it can run in the
  // same batch instead of waiting on the leads query first.
  const [{ data: fetchedLeads, error }, googleStatus, { data: auditRows }] = await Promise.all([
    supabase
      ? supabase.from("prospects").select("*").order("score", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    checkGoogleConnection(),
    supabase
      ? supabase
          .from("audit_log")
          .select("target_id, action, created_at, metadata")
          .eq("target_type", "prospect")
          .order("created_at", { ascending: false })
          .limit(1000)
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

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: allLeads?.filter((l) => l.status === s).length ?? 0 }),
    {} as Record<string, number>
  );
  const followUpCount = allLeads?.filter(needsFollowUp).length ?? 0;
  const contactedCount = allLeads?.filter((l) => l.status === "contacted").length ?? 0;
  const notContactedCount = (allLeads?.length ?? 0) - contactedCount;
  const hasConceptCount = allLeads?.filter((l) => l.concept_slug).length ?? 0;
  const noConceptCount = (allLeads?.length ?? 0) - hasConceptCount;

  // Three independent filter dimensions that AND together (status,
  // contacted/not, concept-built/not) rather than one combined enum —
  // lets you ask e.g. "ready AND no concept yet" in one view, which is
  // the actual question when deciding what to build next.
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
  function filterHref(overrides: { status?: string; contacted?: string; concept?: string; q?: string; sort?: string }) {
    const next = {
      status: statusFilter,
      contacted: contactedFilter,
      concept: conceptFilter,
      q: searchQuery,
      sort: sortKey === "priority" ? undefined : sortKey,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.contacted) params.set("contacted", next.contacted);
    if (next.concept) params.set("concept", next.concept);
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

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={filterHref({ status: undefined })}>
          <Badge variant={!statusFilter ? "default" : "outline"}>All</Badge>
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={filterHref({ status: s })}>
            <Badge variant={statusFilter === s ? "default" : "outline"}>{statusMeta[s].label}</Badge>
          </Link>
        ))}
        <Link href={filterHref({ status: "needs_followup" })}>
          <Badge variant={statusFilter === "needs_followup" ? "default" : "outline"} className="gap-1">
            <Clock className="size-3" />
            Needs follow-up
          </Badge>
        </Link>
      </div>

      {/* Contacted / not contacted — independent of the status pills above,
          so it can combine with them (e.g. "Ready" + "Not contacted"). */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Contact:</span>
        <Link href={filterHref({ contacted: undefined })}>
          <Badge variant={!contactedFilter ? "default" : "outline"}>All ({allLeads?.length ?? 0})</Badge>
        </Link>
        <Link href={filterHref({ contacted: "no" })}>
          <Badge variant={contactedFilter === "no" ? "default" : "outline"} className="gap-1">
            <Mail className="size-3" />
            Not contacted ({notContactedCount})
          </Badge>
        </Link>
        <Link href={filterHref({ contacted: "yes" })}>
          <Badge variant={contactedFilter === "yes" ? "default" : "outline"} className="gap-1">
            <MessageCircleReply className="size-3" />
            Contacted ({contactedCount})
          </Badge>
        </Link>
      </div>

      {/* Concept page built / not — same independence, so you can filter
          e.g. "Ready for outreach" + "No concept yet" to see exactly who
          to build a concept page for next. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Concept page:</span>
        <Link href={filterHref({ concept: undefined })}>
          <Badge variant={!conceptFilter ? "default" : "outline"}>All ({allLeads?.length ?? 0})</Badge>
        </Link>
        <Link href={filterHref({ concept: "no" })}>
          <Badge variant={conceptFilter === "no" ? "default" : "outline"} className="gap-1">
            <FileX className="size-3" />
            No concept yet ({noConceptCount})
          </Badge>
        </Link>
        <Link href={filterHref({ concept: "yes" })}>
          <Badge variant={conceptFilter === "yes" ? "default" : "outline"} className="gap-1">
            <Sparkles className="size-3" />
            Concept made ({hasConceptCount})
          </Badge>
        </Link>
      </div>

      {/* Display order only — doesn't touch the "Do this next" card above,
          which always reasons over the default priority order regardless
          of how the list below is currently sorted. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort:</span>
        {Object.entries(SORT_LABELS).map(([key, label]) => (
          <Link key={key} href={filterHref({ sort: key === "priority" ? undefined : key })}>
            <Badge variant={sortKey === key ? "default" : "outline"}>{label}</Badge>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
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
            {leads?.map((lead) => (
              <li
                key={lead.id}
                id={`lead-${lead.id}`}
                className="scroll-mt-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{lead.business_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[lead.category, lead.neighbourhood].filter(Boolean).join(" · ")}
                      {lead.website && (
                        <>
                          {" · "}
                          <a
                            href={websiteHref(lead.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-accent hover:underline"
                          >
                            {lead.website}
                            <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                      {lead.phone && (
                        <>
                          {" · "}
                          <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-0.5 hover:underline">
                            <Phone className="size-3" />
                            {lead.phone}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ContactBadge lead={lead} />
                    {isStaleLead(lead, auditByLead.get(lead.id)) && (
                      <Badge variant="warning" className="gap-1">
                        <Clock className="size-3" />
                        Stale — 30+ days
                      </Badge>
                    )}
                    {lead.status === "contacted" && !lead.replied_at && (
                      <form action={markLeadReplied.bind(null, lead.id)}>
                        <Button type="submit" variant="ghost" size="xs" className="gap-1 text-muted-foreground">
                          <MessageCircleReply className="size-3" />
                          Mark replied
                        </Button>
                      </form>
                    )}
                    {lead.score != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={cn(
                              "size-1.5 rounded-full",
                              n <= lead.score ? "bg-accent" : "bg-border"
                            )}
                          />
                        ))}
                      </div>
                    )}
                    <EmailLeadButton
                      leadId={lead.id}
                      isFollowUp={lead.status === "contacted"}
                      hasPendingDraft={Boolean(lead.pending_email_message_id)}
                      alreadySent={lead.status === "contacted" && lead.last_contact_method !== "call"}
                    />
                    <form action={deleteLead.bind(null, lead.id)}>
                      <Button type="submit" variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>

                <div className="mt-2">
                  <CallScriptButton leadId={lead.id} phone={lead.phone} />
                </div>

                <form action={updateLeadEmail.bind(null, lead.id)} className="mt-2 flex items-center gap-1.5">
                  <Input
                    name="email"
                    type="email"
                    defaultValue={lead.email ?? ""}
                    placeholder="Add contact email…"
                    className="h-7 max-w-64 text-xs"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>

                <form action={updateLeadPhone.bind(null, lead.id)} className="mt-1.5 flex items-center gap-1.5">
                  <Input
                    name="phone"
                    type="tel"
                    defaultValue={lead.phone ?? ""}
                    placeholder="Add contact number…"
                    className="h-7 max-w-64 text-xs"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>

                <form action={updateLeadConceptSlug.bind(null, lead.id)} className="mt-1.5 flex items-center gap-1.5">
                  <select
                    name="concept_slug"
                    defaultValue={lead.concept_slug ?? ""}
                    className="h-7 max-w-64 min-w-0 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
                  >
                    <option value="">No concept page</option>
                    {conceptSlugs.map((slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                  {lead.concept_slug && (
                    <a
                      href={`/concepts/${lead.concept_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                    >
                      View <ExternalLink className="size-3" />
                    </a>
                  )}
                </form>

                <form action={updateLeadNotes.bind(null, lead.id)} className="mt-1.5 flex items-start gap-1.5">
                  <Textarea
                    name="notes"
                    defaultValue={lead.notes ?? ""}
                    placeholder="Notes — called, no answer, try Thursday…"
                    rows={2}
                    className="max-w-96 text-xs"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>

                {lead.signal && <p className="mt-2 text-sm">{lead.signal}</p>}
                {lead.outreach_note && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Outreach: </span>
                    {lead.outreach_note}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <form key={s} action={updateLeadStatus.bind(null, lead.id, s)}>
                      <Button
                        type="submit"
                        size="xs"
                        variant={lead.status === s ? "default" : "outline"}
                      >
                        {statusMeta[s].label}
                      </Button>
                    </form>
                  ))}
                </div>

                {/* Native <details>, not a client component — zero JS for
                    a per-card collapsible, consistent with this being a
                    plain server component throughout. */}
                {(auditByLead.get(lead.id)?.length ?? 0) > 0 && (
                  <details className="mt-3 text-xs">
                    <summary className="flex cursor-pointer items-center gap-1 text-muted-foreground select-none hover:text-foreground">
                      <History className="size-3" />
                      Timeline ({auditByLead.get(lead.id)!.length})
                    </summary>
                    <ul className="mt-2 space-y-1 border-l border-border pl-3">
                      {auditByLead.get(lead.id)!.map((entry, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="text-foreground">{describeAuditEntry(entry)}</span> —{" "}
                          {timeAgo(entry.created_at)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
