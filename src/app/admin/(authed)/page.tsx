import Link from "next/link";
import { Receipt, HelpCircle, Clock, Globe, CheckCircle2 } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isInvoiceOverdue } from "@/lib/invoice-status";
import { leadNeedsFollowUp } from "@/lib/lead-status";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ClientRef = { business_name: string } | null;

export default async function AdminOverviewPage() {
  const supabase = getSupabaseAdmin();

  const { data: openInvoices } = supabase
    ? await supabase
        .from("invoices")
        .select("id, client_id, amount_pence, description, due_date, status, clients(business_name)")
        .eq("status", "open")
    : { data: [] };
  const overdueInvoices = (openInvoices ?? []).filter(isInvoiceOverdue);

  const { data: awaitingRequests } = supabase
    ? await supabase
        .from("requests")
        .select("id, client_id, raw_text, category, created_at, clients(business_name)")
        .eq("status", "awaiting_info")
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: contactedLeads } = supabase
    ? await supabase.from("prospects").select("id, business_name, contacted_at, status").eq("status", "contacted")
    : { data: [] };
  const staleLeads = (contactedLeads ?? []).filter(leadNeedsFollowUp);

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
  const siteIssues = Array.from(latestPerClient.values()).filter(
    (c) => c.uptime_ok === false || c.ssl_ok === false || (Array.isArray(c.broken_links) && c.broken_links.length > 0)
  );

  const totalAttentionItems =
    overdueInvoices.length + (awaitingRequests?.length ?? 0) + staleLeads.length + siteIssues.length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">What needs your attention today.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{overdueInvoices.length}</p>
          <p className="text-xs text-muted-foreground">Overdue invoices</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{awaitingRequests?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Awaiting your info</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{staleLeads.length}</p>
          <p className="text-xs text-muted-foreground">Leads need follow-up</p>
        </Card>
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{siteIssues.length}</p>
          <p className="text-xs text-muted-foreground">Site issues</p>
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
                        <p className="mt-0.5 text-xs text-muted-foreground">{inv.description}</p>
                      </div>
                      <Badge variant="destructive">£{(inv.amount_pence / 100).toFixed(2)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {awaitingRequests && awaitingRequests.length > 0 && (
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
                      <p className="text-sm font-medium">
                        {(r.clients as unknown as ClientRef)?.business_name ?? "Unknown client"}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{r.raw_text}</p>
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
                      className="card-interactive block rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <p className="text-sm font-medium">{lead.business_name}</p>
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
