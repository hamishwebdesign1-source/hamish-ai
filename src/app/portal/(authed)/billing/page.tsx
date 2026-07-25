import { redirect } from "next/navigation";
import { ExternalLink, Receipt } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getInvoiceDisplay } from "@/lib/invoice-status";
import { Badge } from "@/components/ui/badge";

export default async function PortalBillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const admin = getSupabaseAdmin();
  if (!admin) redirect("/portal/login");

  const { data: client } = await admin.from("clients").select("id, business_name").eq("email", user.email).single();
  if (!client) redirect("/portal/login");

  const { data: invoices } = await admin
    .from("invoices")
    .select("id, amount_pence, description, status, due_date, paid_at, stripe_hosted_invoice_url")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every invoice we've sent {client.business_name}, and its status.</p>

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
