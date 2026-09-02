import Link from "next/link";
import { History, User, Server, Search, X } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACTION_LABEL: Record<string, string> = {
  "client.status_changed": "Client status changed",
  "client.maintenance_rate_changed": "Maintenance rate changed",
  "client.notification_preference_changed": "Notification preference changed",
  "client_member.invited": "Team member invited",
  "client_member.removed": "Team member removed",
  "subscription.started": "Subscription started",
  "subscription.cancelled": "Subscription cancelled",
  // Studio big-ticket ("org deletion requests have no admin resolution
  // path") — see /admin/agencies (the actual resolution surface) for
  // the full reasoning.
  "organisation.deletion_requested": "Account deletion requested",
  "organisation.deletion_request_processed": "Account deletion request processed",
};

const actorTypeVariant: Record<string, "secondary" | "outline" | "warning"> = {
  admin: "secondary",
  client: "outline",
  system: "warning",
};

function describeEntry(entry: { action: string; metadata: Record<string, unknown> | null }) {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "client.status_changed":
      return `${m.from ?? "—"} → ${m.to ?? "—"}`;
    case "client.maintenance_rate_changed":
      return m.maintenance_monthly_pence ? `£${(Number(m.maintenance_monthly_pence) / 100).toFixed(2)}/month` : "Cleared";
    case "client.notification_preference_changed":
      return `Weekly digest: ${m.weekly_digest_enabled ? "on" : "off"}`;
    case "client_member.invited":
      return `${m.email} (${m.role})`;
    case "client_member.removed":
      return String(m.email ?? "");
    default:
      return "";
  }
}

function orgName(entry: { organisations?: { name: string } | { name: string }[] | null }): string | null {
  const org = Array.isArray(entry.organisations) ? entry.organisations[0] : entry.organisations;
  return org?.name ?? null;
}

export default async function ActivityLogPage({ searchParams }: { searchParams: Promise<{ client?: string; q?: string }> }) {
  const { client: clientFilter, q: searchQuery } = await searchParams;
  const supabase = getSupabaseAdmin();

  let query = supabase
    ?.from("audit_log")
    // org_id/organisations(name) added for the two organisation.* actions
    // below — without it, entry.actor is just the raw org UUID
    // logAuditEvent({ actor: orgId, ... }) writes for those (same
    // established, if imperfect, convention client.data_deleted's own
    // actor: orgId already uses), with no way to see what org that even
    // is.
    .select("id, created_at, actor, actor_type, action, client_id, org_id, metadata, clients(business_name), organisations(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (clientFilter) query = query?.eq("client_id", clientFilter);

  const { data: allEntries } = query ? await query : { data: null };

  // Studio improvement — same client-side-over-already-fetched-rows
  // search pattern as every other list page in the app. Searches the
  // action label, actor, describeEntry()'s own detail text, and the
  // linked client's name.
  const trimmedQuery = searchQuery?.trim().toLowerCase();
  const entries = trimmedQuery
    ? (allEntries ?? []).filter((entry) => {
        const client = entry.clients as unknown as { business_name: string } | null;
        const fields = [
          ACTION_LABEL[entry.action] ?? entry.action,
          entry.actor,
          describeEntry(entry as { action: string; metadata: Record<string, unknown> | null }),
          client?.business_name,
          orgName(entry as { organisations?: { name: string } | { name: string }[] | null }),
        ];
        return fields.some((field) => field && String(field).toLowerCase().includes(trimmedQuery));
      })
    : allEntries;

  function filterHref(overrides: { client?: string; q?: string }) {
    const next = { client: clientFilter, q: searchQuery, ...overrides };
    const params = new URLSearchParams();
    if (next.client) params.set("client", next.client);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/admin/activity-log?${qs}` : "/admin/activity-log";
  }

  return (
    <div>
      <h1 className="text-page-title">Activity log</h1>
      <p className="text-page-subtitle mt-1">
        Who did what, when — client status changes, team access, billing, and settings.
        {clientFilter && (
          <>
            {" "}
            <Link href={filterHref({ client: undefined })} className="text-accent hover:underline">
              Clear filter
            </Link>
          </>
        )}
      </p>

      {/* GET form, not a client component — same admin/leads.tsx own
          search precedent. */}
      <form action="/admin/activity-log" className="mt-4 flex items-center gap-2">
        {clientFilter && <input type="hidden" name="client" value={clientFilter} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={searchQuery ?? ""} placeholder="Search by action, actor, or client…" className="h-9 pl-8" />
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

      {!entries?.length && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <History className="size-6 text-muted-foreground/60" />
            {trimmedQuery ? "No entries match that search." : "Nothing logged yet."}
          </CardContent>
        </Card>
      )}

      {!!entries?.length && (
        <ul className="mt-6 space-y-2">
          {entries.map((entry) => {
            const client = entry.clients as unknown as { business_name: string } | null;
            const org = orgName(entry as { organisations?: { name: string } | { name: string }[] | null });
            return (
              <li key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</p>
                    <Badge variant={actorTypeVariant[entry.actor_type] ?? "secondary"} className="gap-1">
                      {entry.actor_type === "admin" ? <User className="size-3" /> : <Server className="size-3" />}
                      {entry.actor}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {describeEntry(entry as { action: string; metadata: Record<string, unknown> | null })}
                    {client && (
                      <>
                        {" · "}
                        <Link href={`/admin/clients/${entry.client_id}`} className="text-accent hover:underline">
                          {client.business_name}
                        </Link>
                      </>
                    )}
                    {!client && org && (
                      <>
                        {" · "}
                        <Link href="/admin/agencies" className="text-accent hover:underline">
                          {org}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
