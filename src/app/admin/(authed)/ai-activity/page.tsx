import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AI_ACTIVITY_ACTIONS, AI_ACTIVITY_GROUPS, describeAiActivity, aiActivityHref } from "@/lib/ai-activity";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent } from "@/components/ui/card";
import { FilterTabs } from "@/components/admin/filter-tabs";

type ClientRef = { business_name: string } | null;

// Portal redesign Stage 5 — the "AI activity is invisible and scattered"
// problem from the Stage 1 audit (research, sales kit, discovery, meeting
// scheduling, triage, auto-send, and progress reports were seven
// unconnected places), fixed with one real feed reading the same
// audit_log entries those flows already write (see ai-activity.ts for the
// shared action list — request.triaged/auto_sent/progress_report_generated
// are new writes added in this stage; everything else already existed).
export default async function AiActivityPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group: groupFilter } = await searchParams;
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
            { key: undefined, label: "All", href: "/admin/ai-activity" },
            ...Object.entries(AI_ACTIVITY_GROUPS).map(([key, group]) => ({
              key,
              label: group.label,
              href: `/admin/ai-activity?group=${key}`,
            })),
          ]}
        />
      </div>

      <div className="mt-6">
        {!entries?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Sparkles className="size-6 text-muted-foreground/60" />
              Nothing yet — AI activity shows up here as it happens.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => {
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
