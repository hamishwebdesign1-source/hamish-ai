import { headers } from "next/headers";
import { ExternalLink, CheckCircle2, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GRAPH_SCOPES } from "@/lib/ms-graph-auth";
import { timeAgo } from "@/lib/time-ago";

export default async function MsSetupPage() {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID;

  const supabase = getSupabaseAdmin();
  const { data: tokenRow } = supabase
    ? await supabase.from("ms_graph_tokens").select("updated_at").eq("id", "default").single()
    : { data: null };
  const isConnected = Boolean(tokenRow);

  const host = (await headers()).get("host") ?? "hamishai.org";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/internal/ms-callback`;

  let authUrl: string | null = null;
  if (clientId && tenantId) {
    authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: GRAPH_SCOPES.join(" "),
      prompt: "consent",
    }).toString()}`;
  }

  const { data: upcomingMeetings } = supabase
    ? await supabase
        .from("lead_meetings")
        .select("id, scheduled_start, join_url, prospects(business_name)")
        .eq("status", "scheduled")
        .order("scheduled_start", { ascending: true })
        .limit(8)
    : { data: [] };

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Microsoft connection</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Powers Teams meeting scheduling from a lead — see docs/teams-meeting-intelligence-plan.md.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status
            {isConnected ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="warning">Not connected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!clientId || !clientSecret || !tenantId ? (
            <p className="text-sm text-muted-foreground">
              Add <code className="rounded bg-secondary px-1 py-0.5 text-xs">MS_CLIENT_ID</code>,{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-xs">MS_CLIENT_SECRET</code>, and{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-xs">MS_TENANT_ID</code> to your environment
              first (from the Azure AD app registration — see docs/teams-meeting-intelligence-plan.md section 2),
              then reload this page.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                This redirect URI must be registered on the Azure AD app registration:
              </p>
              <code className="block rounded-lg bg-secondary px-3 py-2 text-xs break-all">{redirectUri}</code>
              <a
                href={authUrl!}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                {isConnected ? "Reconnect Microsoft account" : "Connect Microsoft account"}
                <ExternalLink className="size-3.5" />
              </a>
              {isConnected && tokenRow?.updated_at && (
                <p className="text-xs text-muted-foreground">Token last refreshed {timeAgo(tokenRow.updated_at)}.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              Upcoming Teams meetings
            </CardTitle>
            <CardDescription>Scheduled from a lead on /admin/leads.</CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingMeetings?.length ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingMeetings.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border bg-card px-3 py-2">
                    <p className="line-clamp-1 text-sm font-medium">
                      {(m.prospects as unknown as { business_name: string } | null)?.business_name ?? "Unknown lead"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {new Date(m.scheduled_start).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      {m.join_url && (
                        <a
                          href={m.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          Join link
                        </a>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
