import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { ClientsPanel } from "@/components/platform/clients-panel";

type InvoiceRow = {
  id: string;
  client_id: string;
  amount_pence: number;
  description: string;
  status: string;
  due_date: string | null;
  stripe_hosted_invoice_url: string | null;
  created_at: string;
};

// Session-scoped client, RLS-enforced via clients_select_own_org /
// invoices_select_own_org (schema-rls-clients-org-staff.sql,
// schema-rls-invoices-org-staff.sql) — a plain filtered query would look
// identical, RLS is what actually guarantees it's correct.
export default async function StudioClientsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const [{ data: clients }, { data: org }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, business_name, email, website_url, maintenance_plan, created_at")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("organisations")
      .select("is_internal, stripe_connect_charges_enabled")
      .eq("id", membership.orgId)
      .single(),
  ]);

  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: invoices } =
    clientIds.length > 0
      ? await supabase
          .from("invoices")
          .select("id, client_id, amount_pence, description, status, due_date, stripe_hosted_invoice_url, created_at")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false })
      : { data: [] as InvoiceRow[] };

  const invoicesByClient: Record<string, InvoiceRow[]> = {};
  for (const inv of invoices ?? []) {
    (invoicesByClient[inv.client_id] ??= []).push(inv);
  }

  // HamishAI's own internal org invoices on the platform's own Stripe
  // account directly (create-invoice.ts's isInternal branch) — always
  // "ready," no Connect account needed.
  const stripeReady = Boolean(org?.is_internal || org?.stripe_connect_charges_enabled);

  return <ClientsPanel clients={clients ?? []} invoicesByClient={invoicesByClient} stripeReady={stripeReady} />;
}
