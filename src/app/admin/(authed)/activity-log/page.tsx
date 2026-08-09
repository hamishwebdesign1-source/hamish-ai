import Link from "next/link";
import { History, User, Server } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { timeAgo } from "@/lib/time-ago";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_LABEL: Record<string, string> = {
  "client.status_changed": "Client status changed",
  "client.maintenance_rate_changed": "Maintenance rate changed",
  "client.notification_preference_changed": "Notification preference changed",
  "client_member.invited": "Team member invited",
  "client_member.removed": "Team member removed",
  "subscription.started": "Subscription started",
  "subscription.cancelled": "Subscription cancelled",
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

export default async function ActivityLogPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client: clientFilter } = await searchParams;
  const supabase = getSupabaseAdmin();

  let query = supabase
    ?.from("audit_log")
    .select("id, created_at, actor, actor_type, action, client_id, metadata, clients(business_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (clientFilter) query = query?.eq("client_id", clientFilter);

  const { data: entries } = query ? await query : { data: null };

  return (
    <div>
      <h1 className="text-page-title">Activity log</h1>
      <p className="text-page-subtitle mt-1">
        Who did what, when — client status changes, team access, billing, and settings.
        {clientFilter && (
          <>
            {" "}
            <Link href="/admin/activity-log" className="text-accent hover:underline">
              Clear filter
            </Link>
          </>
        )}
      </p>

      {!entries?.length && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <History className="size-6 text-muted-foreground/60" />
            Nothing logged yet.
          </CardContent>
        </Card>
      )}

      {!!entries?.length && (
        <ul className="mt-6 space-y-2">
          {entries.map((entry) => {
            const client = entry.clients as unknown as { business_name: string } | null;
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
