import Link from "next/link";
import { Sparkles, Search, X } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AI_ACTIVITY_ACTIONS, AI_ACTIVITY_GROUPS, describeAiActivity, aiActivityHref } from "@/lib/ai-activity";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent } from "@/components/ui/card";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ClientRef = { business_name: string } | null;

// Portal redesign Stage 5 — the "AI activity is invisible and scattered"
// problem from the Stage 1 audit (research, sales kit, discovery, meeting
// scheduling, triage, auto-send, and progress reports were seven
// unconnected places), fixed with one real feed reading the same
// audit_log entries those flows already write (see ai-activity.ts for the
// shared action list — request.triaged/auto_sent/progress_report_generated
// are new writes added in this stage; everything else already existed).
export default async function AiActivityPage({ searchParams }: { searchParams: Promise<{ group?: string; q?: string }> }) {
  const { group: groupFilter, q: searchQuery } = await searchParams;
  const supabase = getSupabaseAdmin();

  const actions =
    groupFilter && AI_ACTIVITY_GROUPS[groupFilter] ? AI_ACTIVITY_GROUPS[groupFilter].actions : AI_ACTIVITY_ACTIONS;

  const { data: entries } = supabase
    ? await supabase
        .from("audit_log")
        .select("id, action, created_at, metadata, target_id, target_type, client_id, clients(business_name)")
        .in("action", actions as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(150)
    : { data: [] };

  // audit_log's target_id is a free-form uuid (it points at whichever
  // table target_type names), so unlike client_id there's no FK for
  // Supabase to embed automatically — resolved with one extra query
  // instead, same pattern as auditByLead grouping on /admin/leads.
  const prospectIds = Array.from(
    new Set((entries ?? []).filter((e) => e.target_type === "prospect" && e.target_id).map((e) => e.target_id as string))
  );
  const { data: prospects } =
    supabase && prospectIds.length
      ? await supabase.from("prospects").select("id, business_name").in("id", prospectIds)
      : { data: [] };
  const prospectNames = new Map((prospects ?? []).map((p) => [p.id, p.business_name]));

  function subjectName(entry: { target_type: string | null; target_id: string | null; clients: unknown }) {
    if (entry.target_type === "prospect" && entry.target_id) return prospectNames.get(entry.target_id) ?? null;
    const client = entry.clients as unknown as ClientRef;
    return client?.business_name ?? null;
  }

  // Studio improvement — same client-side-over-already-fetched-rows
  // search pattern as /admin/audit and /admin/knowledge, ported here as
  // this feed grows past a quick scan. Searches the subject's name and
  // the rendered description text (not the raw action key or metadata —
  // the description is what a person actually reads).
  const trimmedQuery = searchQuery?.trim().toLowerCase();
  const filteredEntries = trimmedQuery
    ? (entries ?? []).filter((entry) => {
        const name = subjectName(entry);
        const description = describeAiActivity(entry.action, entry.metadata ?? {});
        return [name, description].some((field) => field && field.toLowerCase().includes(trimmedQuery));
      })
    : (entries ?? []);

  function filterHref(overrides: { group?: string; q?: string }) {
    const next = { group: groupFilter, q: searchQuery, ...overrides };
    const params = new URLSearchParams();
    if (next.group) params.set("group", next.group);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/admin/ai-activity?${qs}` : "/admin/ai-activity";
  }

  return (
    <div>
      <h1 className="text-page-title">AI Activity</h1>
      <p className="text-page-subtitle mt-1">
        Every AI action across the portal, in one place — research, sales kits, lead discovery, meeting scheduling,
        client-request triage, auto-sent replies, and progress reports.
      </p>

      <div className="mt-6">
        <FilterTabs
          activeKey={groupFilter}
          options={[
            { key: undefined, label: "All", href: filterHref({ group: undefined }) },
            ...Object.entries(AI_ACTIVITY_GROUPS).map(([key, group]) => ({
              key,
              label: group.label,
              href: filterHref({ group: key }),
            })),
          ]}
        />
      </div>

      {/* GET form, not a client component — same /admin/audit precedent. */}
      <form action="/admin/ai-activity" className="mt-3 flex items-center gap-2">
        {groupFilter && <input type="hidden" name="group" value={groupFilter} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={searchQuery ?? ""} placeholder="Search by client or action…" className="h-9 pl-8" />
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

      <div className="mt-6">
        {!filteredEntries.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Sparkles className="size-6 text-muted-foreground/60" />
              {trimmedQuery ? "No entries match that search." : "Nothing yet — AI activity shows up here as it happens."}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filteredEntries.map((entry) => {
              const href = aiActivityHref(entry);
              const name = subjectName(entry);
              const content = (
                <>
                  <p className="flex items-start gap-1.5 text-sm">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--gradient-violet)]" />
                    <span className={href ? "group-hover:text-accent" : ""}>
                      {describeAiActivity(entry.action, entry.metadata ?? {})}
                    </span>
                  </p>
                  <p className="mt-1 pl-5 text-xs text-muted-foreground">
                    {name && <span className="font-medium text-foreground">{name}</span>}
                    {name && " · "}
                    {timeAgo(entry.created_at)}
                  </p>
                </>
              );
              return (
                <li key={entry.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  {href ? (
                    <Link href={href} className="group block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
