import Link from "next/link";
import { Receipt, HelpCircle, Clock, Globe, CheckCircle2, AlertOctagon } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isInvoiceOverdue } from "@/lib/invoice-status";
import { leadNeedsFollowUp } from "@/lib/lead-status";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ClientRef = { business_name: string } | null;

// Escalation thresholds — a second, more urgent tier on top of the existing
// "needs attention" flags, so a request stuck for 3 days doesn't read the
// same as one stuck for 3 weeks. Day counts are deliberately more generous
// than the base flag (e.g. an invoice is "overdue" the moment its due date
// passes, but only "critical" after CRITICAL_INVOICE_DAYS more).
const CRITICAL_INVOICE_DAYS = 14;
const CRITICAL_AWAITING_INFO_DAYS = 7;
const CRITICAL_LEAD_FOLLOWUP_DAYS = 14;

function daysSince(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function CriticalBadge() {
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertOctagon className="size-3" />
      Critical
    </Badge>
  );
}

export default async function AdminOverviewPage() {
  const supabase = getSupabaseAdmin();

  const { data: openInvoices } = supabase
    ? await supabase
        .from("invoices")
        .select("id, client_id, amount_pence, description, due_date, status, clients(business_name)")
        .eq("status", "open")
    : { data: [] };
  const overdueInvoices = (openInvoices ?? [])
    .filter(isInvoiceOverdue)
    .map((inv) => ({ ...inv, daysOverdue: inv.due_date ? daysSince(inv.due_date) : 0 }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const criticalInvoiceCount = overdueInvoices.filter((inv) => inv.daysOverdue >= CRITICAL_INVOICE_DAYS).length;

  const { data: awaitingRequestsRaw } = supabase
    ? await supabase
        .from("requests")
        .select("id, client_id, raw_text, category, created_at, clients(business_name)")
        .eq("status", "awaiting_info")
        .order("created_at", { ascending: true })
    : { data: [] };
  const awaitingRequests = (awaitingRequestsRaw ?? [])
    .map((r) => ({ ...r, daysWaiting: daysSince(r.created_at) }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting);
  const criticalAwaitingCount = awaitingRequests.filter((r) => r.daysWaiting >= CRITICAL_AWAITING_INFO_DAYS).length;

  const { data: contactedLeads } = supabase
    ? await supabase.from("prospects").select("id, business_name, contacted_at, status").eq("status", "contacted")
    : { data: [] };
  const staleLeads = (contactedLeads ?? [])
    .filter(leadNeedsFollowUp)
    .map((lead) => ({ ...lead, daysSinceContact: lead.contacted_at ? daysSince(lead.contacted_at) : 0 }))
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  const criticalLeadCount = staleLeads.filter((l) => l.daysSinceContact >= CRITICAL_LEAD_FOLLOWUP_DAYS).length;

  const { data: recentChecks } = supabase
    ? await supabase
        .from("site_checks")
        .select("client_id, uptime_ok, ssl_ok, broken_links, checked_at, clients(business_name)")
        .order("checked_at", { ascending: false })
        .limit(50)
    : { data: [] };
  const latestPerClient = new Map<string, NonNullable<typeof recentChecks>[number]>();
  for (const check of recentChecks ?? []) {
    if (!latestPerClient.has(check.client_id)) latestPerClient.set(check.client_id, check);
  }
  const siteIssues = Array.from(latestPerClient.values())
    .filter((c) => c.uptime_ok === false || c.ssl_ok === false || (Array.isArray(c.broken_links) && c.broken_links.length > 0))
    .sort((a, b) => (a.uptime_ok === false ? -1 : 0) - (b.uptime_ok === false ? -1 : 0));
  // A live outage is always urgent regardless of how long it's been down —
  // there's no need for a duration threshold the way the other categories have.
  const criticalSiteCount = siteIssues.filter((c) => c.uptime_ok === false).length;

  const totalAttentionItems =
    overdueInvoices.length + awaitingRequests.length + staleLeads.length + siteIssues.length;
  const totalCritical = criticalInvoiceCount + criticalAwaitingCount + criticalLeadCount + criticalSiteCount;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What needs your attention today.
        {totalCritical > 0 && (
          <span className="ml-2 font-medium text-destructive">
            {totalCritical} critical item{totalCritical === 1 ? "" : "s"}.
          </span>
        )}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className={`font-heading text-2xl font-semibold ${criticalInvoiceCount > 0 ? "text-destructive" : ""}`}>
            {overdueInvoices.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Overdue invoices{criticalInvoiceCount > 0 ? ` · ${criticalInvoiceCount} critical` : ""}
          </p>
        </Card>
        <Card className="p-4">
          <p className={`font-heading text-2xl font-semibold ${criticalAwaitingCount > 0 ? "text-destructive" : ""}`}>
            {awaitingRequests.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Awaiting your info{criticalAwaitingCount > 0 ? ` · ${criticalAwaitingCount} critical` : ""}
          </p>
        </Card>
        <Card className="p-4">
          <p className={`font-heading text-2xl font-semibold ${criticalLeadCount > 0 ? "text-destructive" : ""}`}>
            {staleLeads.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Leads need follow-up{criticalLeadCount > 0 ? ` · ${criticalLeadCount} critical` : ""}
          </p>
        </Card>
        <Card className="p-4">
          <p className={`font-heading text-2xl font-semibold ${criticalSiteCount > 0 ? "text-destructive" : ""}`}>
            {siteIssues.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Site issues{criticalSiteCount > 0 ? ` · ${criticalSiteCount} critical` : ""}
          </p>
        </Card>
      </div>

      {totalAttentionItems === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-6 text-success" />
            All caught up — nothing needs attention right now.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-8">
          {overdueInvoices.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 font-heading text-lg font-medium">
                <Receipt className="size-4 text-destructive" />
                Overdue invoices
              </h2>
              <ul className="mt-3 space-y-2">
                {overdueInvoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/admin/clients/${inv.client_id}`}
                      className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {(inv.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {inv.description} · {Math.round(inv.daysOverdue)} day{Math.round(inv.daysOverdue) === 1 ? "" : "s"} overdue
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {inv.daysOverdue >= CRITICAL_INVOICE_DAYS && <CriticalBadge />}
                        <Badge variant="destructive">£{(inv.amount_pence / 100).toFixed(2)}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {awaitingRequests.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 font-heading text-lg font-medium">
                <HelpCircle className="size-4 text-warning" />
                Requests awaiting your info
              </h2>
              <ul className="mt-3 space-y-2">
                {awaitingRequests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="card-interactive block rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {(r.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                        </p>
                        {r.daysWaiting >= CRITICAL_AWAITING_INFO_DAYS && <CriticalBadge />}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {r.raw_text} · waiting {Math.round(r.daysWaiting)} day{Math.round(r.daysWaiting) === 1 ? "" : "s"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {staleLeads.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 font-heading text-lg font-medium">
                <Clock className="size-4 text-warning" />
                Leads need follow-up
              </h2>
              <ul className="mt-3 space-y-2">
                {staleLeads.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href="/admin/leads?status=needs_followup"
                      className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{lead.business_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {Math.round(lead.daysSinceContact)} day{Math.round(lead.daysSinceContact) === 1 ? "" : "s"} since contact
                        </p>
                      </div>
                      {lead.daysSinceContact >= CRITICAL_LEAD_FOLLOWUP_DAYS && <CriticalBadge />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {siteIssues.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 font-heading text-lg font-medium">
                <Globe className="size-4 text-destructive" />
                Site issues
              </h2>
              <ul className="mt-3 space-y-2">
                {siteIssues.map((check) => (
                  <li key={check.client_id}>
                    <Link
                      href={`/admin/clients/${check.client_id}`}
                      className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <p className="text-sm font-medium">
                        {(check.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                      </p>
                      <div className="flex gap-1.5">
                        {check.uptime_ok === false && <CriticalBadge />}
                        {check.uptime_ok === false && <Badge variant="destructive">Down</Badge>}
                        {check.ssl_ok === false && <Badge variant="destructive">SSL</Badge>}
                        {Array.isArray(check.broken_links) && check.broken_links.length > 0 && (
                          <Badge variant="warning">{check.broken_links.length} broken links</Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
