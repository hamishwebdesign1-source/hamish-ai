import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarCheck, ExternalLink, Globe, LineChart, Receipt, UserPlus, Users, X, Zap } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";
import { createInvoice } from "@/lib/create-invoice";
import {
  updateTaskStatus,
  sendInvoiceReminderAction,
  updateMaintenanceRate,
  updateClientStatus,
  toggleAnalyticsEnabled,
  inviteClientMember,
  removeClientMember,
  startSubscriptionAction,
  cancelSubscriptionAction,
} from "@/app/admin/actions";
import { timeAgo } from "@/lib/time-ago";
import { getInvoiceDisplay, isInvoiceOverdue } from "@/lib/invoice-status";
import { ProgressReportButton } from "@/components/admin/progress-report-button";
import { SiteCheckButton } from "@/components/admin/site-check-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/status-badges";

async function createInvoiceForClient(clientId: string, formData: FormData) {
  "use server";
  const amountPounds = parseFloat(String(formData.get("amount") || "0"));
  const description = String(formData.get("description") || "").trim();
  if (!amountPounds || amountPounds <= 0 || !description) return;

  const result = await createInvoice({
    clientId,
    amountPence: Math.round(amountPounds * 100),
    description,
  });

  if ("error" in result) console.error("Failed to create invoice:", result.error);

  revalidatePath(`/admin/clients/${clientId}`);
}

async function logRequest(clientId: string, formData: FormData) {
  "use server";
  const rawText = String(formData.get("raw_text") || "").trim();
  if (!rawText) return;

  const result = await triageRequest(clientId, rawText);
  if ("request" in result) {
    redirect(`/admin/requests/${result.request.id}`);
  }
}

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const planLabel: Record<string, string> = {
  none: "No maintenance plan",
  basic: "Basic maintenance",
  growth: "Growth partnership",
};

const subscriptionStatusVariant: Record<string, "success" | "warning" | "secondary"> = {
  active: "success",
  trialing: "success",
  past_due: "warning",
  incomplete: "warning",
  canceled: "secondary",
  unpaid: "warning",
  incomplete_expired: "secondary",
  paused: "secondary",
};

const CLIENT_STATUSES = ["active", "paused", "churned"] as const;
const clientStatusVariant: Record<string, "success" | "warning" | "secondary"> = {
  active: "success",
  paused: "warning",
  churned: "secondary",
};

// Wrapping Date.now() in a named helper, rather than calling it directly
// inside the component body, keeps the react-hooks purity lint rule happy
// — same pattern as daysSince() in lib/lead-meta.ts and isFuture() in the
// lead detail page.
function isTaskBlocked(status: string, createdAt: string) {
  return status !== "done" && Date.now() - new Date(createdAt).getTime() > SEVEN_DAYS_MS;
}

// Portal redesign Stage 6 — this was the densest page in the portal (the
// Stage 1 audit's #5 ranked problem): 6+ sub-tools stacked with no anchor
// nav. Same sections, same forms, same server actions, unchanged — just
// grouped under real headings with a jump-to nav instead of one long
// unbroken scroll.
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "ai-tools", label: "AI Tools" },
  { id: "team", label: "Team" },
  { id: "requests", label: "Requests" },
  { id: "tasks", label: "Tasks" },
  { id: "invoices", label: "Invoices" },
];

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase
        .from("tasks")
        .select("*")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: siteChecks } = await supabase
    .from("site_checks")
    .select("*")
    .eq("client_id", id)
    .order("checked_at", { ascending: false })
    .limit(1);
  const latestCheck = siteChecks?.[0] ?? null;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: members } = await supabase
    .from("client_members")
    .select("id, email, role, accepted_at, invited_at")
    .eq("client_id", id)
    .order("invited_at", { ascending: true });

  const logRequestWithId = logRequest.bind(null, id);
  const revalidatePath = `/admin/clients/${id}`;

  return (
    <div>
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All clients
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-page-title">{client.business_name}</h1>
          <p className="text-page-subtitle mt-1">
            {client.name} · {client.email || "no email on file"}
          </p>
          {client.website_url && (
            <a
              href={client.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              <Globe className="size-3.5" />
              {client.website_url}
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={clientStatusVariant[client.status] ?? "secondary"} className="capitalize">
            {client.status ?? "active"}
          </Badge>
          <Badge variant="outline">{client.package || "No package"}</Badge>
          <Badge variant={client.maintenance_plan === "growth" ? "warning" : client.maintenance_plan === "basic" ? "accent" : "secondary"}>
            {planLabel[client.maintenance_plan] ?? client.maintenance_plan}
          </Badge>
        </div>
      </div>

      {/* Jump-to nav — the fix for the Stage 1 audit's "6+ sub-tools
          stacked with no anchor nav" finding. Plain anchor links, no
          scroll-spy JS: this is a reorganization pass, not new
          functionality, and a working jump link beats a client-side
          active-state indicator that isn't there yet. */}
      <nav className="mt-6 flex flex-wrap gap-1.5 border-b border-border pb-6">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              {s.label}
            </Badge>
          </a>
        ))}
      </nav>

      <section id="overview" className="mt-8 scroll-mt-20">
        <h2 className="text-section-title">Overview</h2>
        <Card className="mt-3">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Status:</span>
              {CLIENT_STATUSES.map((s) => (
                <form key={s} action={updateClientStatus.bind(null, id, s, revalidatePath)}>
                  <Button type="submit" size="xs" variant={client.status === s ? "default" : "outline"} className="capitalize">
                    {s}
                  </Button>
                </form>
              ))}
              {client.status !== "active" && (
                <span className="text-[11px] text-muted-foreground">
                  Recurring invoicing and site monitoring are paused while not active.
                </span>
              )}
            </div>

            <form
              action={updateMaintenanceRate.bind(null, id, revalidatePath)}
              className="flex flex-wrap items-center gap-1.5"
            >
              <Label htmlFor="maintenance_monthly" className="text-xs text-muted-foreground">
                Recurring monthly rate (£)
              </Label>
              <Input
                id="maintenance_monthly"
                name="maintenance_monthly"
                type="number"
                step="0.01"
                min="0"
                defaultValue={client.maintenance_monthly_pence ? (client.maintenance_monthly_pence / 100).toFixed(2) : ""}
                placeholder="e.g. 75.00"
                className="h-7 max-w-32 text-xs"
              />
              <Button type="submit" variant="ghost" size="xs">
                Save
              </Button>
              {client.maintenance_monthly_pence && !client.stripe_subscription_id ? (
                <span className="text-[11px] text-muted-foreground">
                  Auto-invoiced on the 1st of each month — or start a real subscription below
                </span>
              ) : null}
            </form>

            {client.maintenance_monthly_pence ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Receipt className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Subscription:</span>
                {client.stripe_subscription_id ? (
                  <>
                    <Badge variant={subscriptionStatusVariant[client.subscription_status ?? ""] ?? "secondary"} className="capitalize">
                      {(client.subscription_status ?? "active").replace("_", " ")}
                    </Badge>
                    <form action={cancelSubscriptionAction.bind(null, id, revalidatePath)}>
                      <Button type="submit" size="xs" variant="outline">
                        Cancel
                      </Button>
                    </form>
                  </>
                ) : (
                  <form action={startSubscriptionAction.bind(null, id, revalidatePath)}>
                    <Button type="submit" size="xs">
                      Start subscription
                    </Button>
                  </form>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {client.stripe_subscription_id
                    ? "Stripe bills this automatically each month — no more manual monthly invoicing needed."
                    : "Moves this client off the monthly cron onto a real Stripe subscription."}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5">
              <LineChart className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI Business Analytics:</span>
              <form action={toggleAnalyticsEnabled.bind(null, id, !client.analytics_enabled, revalidatePath)}>
                <Button type="submit" size="xs" variant={client.analytics_enabled ? "default" : "outline"}>
                  {client.analytics_enabled ? "Enabled" : "Not enabled"}
                </Button>
              </form>
              <span className="text-[11px] text-muted-foreground">
                {client.analytics_enabled
                  ? "Client can see the Site Traffic tab once they connect Google Analytics."
                  : "Flip on once they've paid for the package."}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="ai-tools" className="mt-8 scroll-mt-20">
        <h2 className="text-section-title">AI Tools</h2>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <ProgressReportButton clientId={id} />
          {client.website_url && <SiteCheckButton clientId={id} latestCheck={latestCheck} />}
        </div>
      </section>

      <section id="team" className="mt-8 scroll-mt-20">
        <h2 className="text-section-title">Team</h2>
        <Card className="mt-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Users className="size-4" />
              Team members
            </CardTitle>
            <CardDescription>
              Anyone listed here can sign in at{" "}
              <Link href="/portal/login" className="text-accent hover:underline">
                /portal/login
              </Link>{" "}
              with their own email — no shared password, no account to create. Admin-managed for now: invite whoever
              should have access, remove anyone who shouldn&apos;t.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!members?.length && <p className="text-sm text-muted-foreground">No portal access set up yet.</p>}
            {!!members?.length && (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.role === "owner" ? "Owner" : "Member"} ·{" "}
                        {m.accepted_at ? "Active" : "Invited, not yet signed in"}
                      </p>
                    </div>
                    <form action={removeClientMember.bind(null, m.id, `/admin/clients/${id}`)}>
                      <Button type="submit" variant="ghost" size="xs" aria-label={`Remove ${m.email}`}>
                        <X className="size-3.5" />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={inviteClientMember.bind(null, id, `/admin/clients/${id}`)}
              className="mt-4 flex flex-wrap items-end gap-2"
            >
              <div className="min-w-[180px] flex-1 space-y-1.5">
                <Label htmlFor="member_email">Invite by email</Label>
                <Input id="member_email" name="email" type="email" required placeholder="name@business.com" className="h-8" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member_role">Role</Label>
                <select
                  id="member_role"
                  name="role"
                  defaultValue="member"
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <Button type="submit" size="sm" className="gap-1.5">
                <UserPlus className="size-3.5" />
                Invite
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="requests" className="mt-8 scroll-mt-20">
        <h2 className="text-section-title">Requests</h2>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Log a new request</CardTitle>
              <CardDescription>Paste in whatever the client said — email, call notes, chat message.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={logRequestWithId} className="mt-2 space-y-3">
                <Textarea
                  name="raw_text"
                  required
                  rows={6}
                  placeholder="e.g. Can you update our opening hours to 8am-6pm Mon-Fri?"
                />
                <Button type="submit" variant="ai" className="w-full gap-1.5">
                  <Zap className="size-3.5" />
                  Run AI triage
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Request history</h3>
            {!requests?.length && <p className="mt-3 text-sm text-muted-foreground">No requests logged yet.</p>}
            <ul className="mt-3 space-y-2">
              {requests?.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="card-interactive block rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{r.raw_text}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.auto_sent && (
                          <Badge variant="success" className="gap-1">
                            <Zap className="size-3" />
                            Auto-sent
                          </Badge>
                        )}
                        {r.priority && <PriorityBadge priority={r.priority} />}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.status} {r.category ? `· ${r.category}` : ""} {r.complexity ? `· ${r.complexity}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="tasks" className="mt-8 scroll-mt-20">
        <h2 className="text-section-title">Tasks</h2>
        {!tasks?.length && <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>}
        <ul className="mt-3 space-y-2">
          {tasks?.map((t) => {
            const isBlocked = isTaskBlocked(t.status, t.created_at);
            return (
              <li key={t.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {t.calendar_event_id && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarCheck className="size-3" />
                        On calendar
                      </span>
                    )}
                    {isBlocked && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="size-3" />
                        Needs attention
                      </Badge>
                    )}
                  </div>
                </div>
                {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                <div className="mt-3 flex gap-1.5">
                  {TASK_STATUSES.map((status) => (
                    <form key={status} action={updateTaskStatus.bind(null, t.id, status, revalidatePath)}>
                      <Button
                        type="submit"
                        size="xs"
                        variant={t.status === status ? "default" : "outline"}
                        className="capitalize"
                      >
                        {status.replace("_", " ")}
                      </Button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="invoices" className="mt-8 scroll-mt-20">
        <h2 className="text-section-title">Invoices</h2>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Create invoice</CardTitle>
              <CardDescription>Sent via Stripe — the client pays online, status syncs back automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createInvoiceForClient.bind(null, id)} className="mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (£)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="150.00" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="What's this invoice for?" rows={3} required />
                </div>
                <Button type="submit" className="w-full">
                  Create &amp; send invoice
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Invoice history</h3>
            {!invoices?.length && <p className="mt-3 text-sm text-muted-foreground">No invoices yet.</p>}
            <ul className="mt-3 space-y-2">
              {invoices?.map((inv) => {
                const isOverdue = isInvoiceOverdue(inv);
                const meta = getInvoiceDisplay(inv);
                return (
                  <li key={inv.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">£{(inv.amount_pence / 100).toFixed(2)}</p>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{inv.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {inv.stripe_hosted_invoice_url && (
                        <a
                          href={inv.stripe_hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <Receipt className="size-3" />
                          View invoice
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      {isOverdue && (
                        <form action={sendInvoiceReminderAction.bind(null, inv.id, revalidatePath)}>
                          <Button type="submit" size="xs" variant="outline">
                            Send reminder
                          </Button>
                        </form>
                      )}
                    </div>
                    {inv.reminder_sent_at && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Reminder sent {timeAgo(inv.reminder_sent_at)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
