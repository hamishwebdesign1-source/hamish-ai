import { headers } from "next/headers";
import { google } from "googleapis";
import { CheckCircle2, ExternalLink, Mail, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupabaseAdmin } from "@/lib/supabase";
import { timeAgo } from "@/lib/time-ago";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  // Content Factory YouTube publishing (src/lib/youtube.ts) — added to
  // the same shared OAuth client rather than a second connector. An
  // account connected before this scope existed needs one reconnect to
  // pick it up; Google only re-issues the full scope set on a fresh
  // consent, not incrementally.
  "https://www.googleapis.com/auth/youtube.upload",
];

export default async function GoogleSetupPage() {
  const isConnected = Boolean(process.env.GOOGLE_REFRESH_TOKEN);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const host = (await headers()).get("host") ?? "hamishai.org";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/internal/google-callback`;

  let authUrl: string | null = null;
  if (clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
    });
  }

  const supabase = getSupabaseAdmin();

  const { data: processedEmails } = supabase
    ? await supabase
        .from("processed_emails")
        .select("message_id, subject, processed_at, clients(business_name)")
        .order("processed_at", { ascending: false })
        .limit(8)
    : { data: [] };

  const { data: calendarTasks } = supabase
    ? await supabase
        .from("tasks")
        .select("id, title, created_at, requests(clients(business_name))")
        .not("calendar_event_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Google connection</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Powers automatic email-inbox triage, calendar sync for new tasks, and Content Factory&apos;s YouTube publishing.
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
          {!clientId || !clientSecret ? (
            <p className="text-sm text-muted-foreground">
              Add <code className="rounded bg-secondary px-1 py-0.5 text-xs">GOOGLE_CLIENT_ID</code> and{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-xs">GOOGLE_CLIENT_SECRET</code> to your
              environment first (from the Google Cloud OAuth client you create), then reload this page.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                This redirect URI must be registered on your Google Cloud OAuth client:
              </p>
              <code className="block rounded-lg bg-secondary px-3 py-2 text-xs break-all">{redirectUri}</code>
              <a
                href={authUrl!}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                {isConnected ? "Reconnect Google account" : "Connect Google account"}
                <ExternalLink className="size-3.5" />
              </a>
              {!isConnected && (
                <p className="text-xs text-muted-foreground">
                  While your OAuth app is in Google&apos;s &quot;Testing&quot; status, the connection expires
                  after 7 days — reconnecting here takes a few seconds any time it lapses.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                Recent emails processed
              </CardTitle>
              <CardDescription>Client emails the inbox cron picked up and turned into requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {!processedEmails?.length ? (
                <p className="text-sm text-muted-foreground">Nothing processed yet.</p>
              ) : (
                <ul className="space-y-2">
                  {processedEmails.map((e) => (
                    <li key={e.message_id} className="rounded-lg border border-border bg-card px-3 py-2">
                      <p className="line-clamp-1 text-sm font-medium">{e.subject || "(no subject)"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {(e.clients as unknown as { business_name: string } | null)?.business_name ?? "Unknown client"}
                        {" · "}
                        {timeAgo(e.processed_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" />
                Recent calendar events
              </CardTitle>
              <CardDescription>Follow-up tasks automatically added to your calendar after triage.</CardDescription>
            </CardHeader>
            <CardContent>
              {!calendarTasks?.length ? (
                <p className="text-sm text-muted-foreground">No calendar events created yet.</p>
              ) : (
                <ul className="space-y-2">
                  {calendarTasks.map((t) => (
                    <li key={t.id} className="rounded-lg border border-border bg-card px-3 py-2">
                      <p className="line-clamp-1 text-sm font-medium">{t.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {(t.requests as unknown as { clients: { business_name: string } | null } | null)?.clients
                          ?.business_name ?? "Unknown client"}
                        {" · "}
                        {timeAgo(t.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
