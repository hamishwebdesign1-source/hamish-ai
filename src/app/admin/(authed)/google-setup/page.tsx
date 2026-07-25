import { headers } from "next/headers";
import { google } from "googleapis";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
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

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Google connection</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Powers automatic email-inbox triage and calendar sync for new tasks.
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
    </div>
  );
}
