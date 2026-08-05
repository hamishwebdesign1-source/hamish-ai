import { redirect } from "next/navigation";
import { ExternalLink, Receipt, Wallet, Clock } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getInvoiceDisplay } from "@/lib/invoice-status";
import { Badge } from "@/components/ui/badge";

export default async function PortalBillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");

  const { data: client } = await supabase.from("clients").select("id, business_name").eq("id", membership.clientId).single();
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
      <h1 className="font-heading text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every invoice we&apos;ve sent {client.business_name}, and its status.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Wallet className="size-4" />
            </span>
            <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
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
            <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
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
            <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
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

      {!invoices?.length && <p className="mt-8 text-sm text-muted-foreground">No invoices yet.</p>}

      <ul className="mt-8 space-y-3">
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
