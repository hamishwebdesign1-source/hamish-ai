import { redirect } from "next/navigation";
import { ExternalLink, Receipt, Wallet, Clock, CreditCard } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getInvoiceDisplay } from "@/lib/invoice-status";
import { InvoiceHistoryExport } from "@/components/platform/invoice-history-export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PORTAL_ERROR_COPY: Record<string, string> = {
  not_set_up:
    "There's no billing account set up for you yet — this appears once your first invoice or subscription has been created.",
  unavailable: "Couldn't open billing management right now — try again in a moment, or contact us if it persists.",
};

export default async function PortalBillingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorParam } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id, business_name, stripe_customer_id")
    .eq("id", membership.clientId)
    .single();
  if (!client) redirect("/portal/login");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount_pence, description, status, due_date, paid_at, stripe_hosted_invoice_url")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const thisYear = new Date().getFullYear();
  const paidThisYearPence = (invoices ?? [])
    .filter((inv) => inv.status === "paid" && inv.paid_at && new Date(inv.paid_at).getFullYear() === thisYear)
    .reduce((sum, inv) => sum + inv.amount_pence, 0);

  const outstanding = (invoices ?? []).filter((inv) => inv.status !== "paid" && inv.status !== "void");
  const outstandingPence = outstanding.reduce((sum, inv) => sum + inv.amount_pence, 0);
  const nextDue = outstanding.filter((inv) => inv.due_date).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-page-title">Billing</h1>
          <p className="text-page-subtitle mt-1">Every invoice we&apos;ve sent {client.business_name}, and its status.</p>
        </div>
        {client.stripe_customer_id && (
          <form action="/api/portal/stripe-portal-session" method="post">
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <CreditCard className="size-3.5" />
              Manage billing
            </Button>
          </form>
        )}
      </div>

      {errorParam && PORTAL_ERROR_COPY[errorParam] && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{PORTAL_ERROR_COPY[errorParam]}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Wallet className="size-4" />
            </span>
            <p className="text-eyebrow">
              Paid in {thisYear}
            </p>
          </div>
          <p className="mt-3 font-heading text-2xl font-semibold">£{(paidThisYearPence / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-lg ${
                outstandingPence > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
              }`}
            >
              <Receipt className="size-4" />
            </span>
            <p className="text-eyebrow">
              Outstanding
            </p>
          </div>
          <p className="mt-3 font-heading text-2xl font-semibold">£{(outstandingPence / 100).toFixed(2)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {outstandingPence > 0 ? `${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}` : "All settled"}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-border bg-card p-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Clock className="size-4" />
            </span>
            <p className="text-eyebrow">
              Next due
            </p>
          </div>
          <p className="mt-3 font-heading text-2xl font-semibold">
            {nextDue ? `£${(nextDue.amount_pence / 100).toFixed(2)}` : "—"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {nextDue?.due_date
              ? new Date(nextDue.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
              : "Nothing scheduled"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section-title">Invoice history</h2>
        {/* Studio improvement — same gap analytics-csv.ts closed for
            Studio's own Analytics page, ported here: real data with
            nowhere to take it (a spreadsheet, an accountant). */}
        {!!invoices?.length && <InvoiceHistoryExport businessName={client.business_name} invoices={invoices} />}
      </div>

      {!invoices?.length && <p className="mt-3 text-sm text-muted-foreground">No invoices yet.</p>}

      <ul className="mt-3 space-y-3">
        {invoices?.map((inv) => {
          const meta = getInvoiceDisplay(inv);
          const isPaid = inv.status === "paid";
          return (
            <li key={inv.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">£{(inv.amount_pence / 100).toFixed(2)}</p>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{inv.description}</p>
              {inv.due_date && !isPaid && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Due {new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {isPaid && inv.paid_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid {new Date(inv.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {inv.stripe_hosted_invoice_url && (
                <a
                  href={inv.stripe_hosted_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <Receipt className="size-3" />
                  {isPaid ? "View receipt" : "Pay now"}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
