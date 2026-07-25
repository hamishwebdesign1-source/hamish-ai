import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarCheck, ExternalLink, Globe, Receipt, Zap } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { triageRequest } from "@/lib/triage-request";
import { createInvoice } from "@/lib/create-invoice";
import { updateTaskStatus, sendInvoiceReminderAction } from "@/app/admin/actions";
import { timeAgo } from "@/lib/time-ago";
import { ProgressReportButton } from "@/components/admin/progress-report-button";
import { SiteCheckButton } from "@/components/admin/site-check-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/status-badges";

const invoiceStatusMeta: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  open: { label: "Awaiting payment", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  void: { label: "Void", variant: "secondary" },
  uncollectible: { label: "Uncollectible", variant: "destructive" },
};

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
          <h1 className="font-heading text-2xl font-semibold">{client.business_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
          <Badge variant="outline">{client.package || "No package"}</Badge>
          <Badge variant={client.maintenance_plan === "growth" ? "warning" : client.maintenance_plan === "basic" ? "accent" : "secondary"}>
            {planLabel[client.maintenance_plan] ?? client.maintenance_plan}
          </Badge>
        </div>
      </div>

      {client.email && (
        <p className="mt-3 text-xs text-muted-foreground">
          Portal access: they can sign in at{" "}
          <Link href="/portal/login" className="text-accent hover:underline">
            /portal/login
          </Link>{" "}
          with <span className="font-medium text-foreground">{client.email}</span>.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ProgressReportButton clientId={id} />
        {client.website_url && <SiteCheckButton clientId={id} latestCheck={latestCheck} />}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
              <Button type="submit" className="w-full">
                Run AI triage
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-heading text-lg font-medium">Request history</h2>
          {!requests?.length && <p className="mt-3 text-sm text-muted-foreground">No requests logged yet.</p>}
          <ul className="mt-4 space-y-2">
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

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Tasks</h2>
        {!tasks?.length && <p className="mt-3 text-sm text-muted-foreground">No tasks yet.</p>}
        <ul className="mt-4 space-y-2">
          {tasks?.map((t) => {
            const isBlocked = t.status !== "done" && Date.now() - new Date(t.created_at).getTime() > SEVEN_DAYS_MS;
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
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
          <h2 className="font-heading text-lg font-medium">Invoices</h2>
          {!invoices?.length && <p className="mt-3 text-sm text-muted-foreground">No invoices yet.</p>}
          <ul className="mt-4 space-y-2">
            {invoices?.map((inv) => {
              const isOverdue =
                inv.status === "open" && !!inv.due_date && inv.due_date < new Date().toISOString().slice(0, 10);
              const meta = isOverdue
                ? { label: "Overdue", variant: "destructive" as const }
                : invoiceStatusMeta[inv.status] ?? invoiceStatusMeta.draft;
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
    </div>
  );
}
