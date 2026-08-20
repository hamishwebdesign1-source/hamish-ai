import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { ClientsPanel } from "@/components/platform/clients-panel";
import { computeClientHealth, type ClientHealth } from "@/lib/client-health";

type InvoiceRow = {
  id: string;
  client_id: string;
  amount_pence: number;
  description: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  stripe_hosted_invoice_url: string | null;
  created_at: string;
};

type RequestRow = { id: string; client_id: string; status: string };
type TaskRow = { id: string; request_id: string | null; status: string };
type SiteCheckRow = { client_id: string; uptime_ok: boolean | null };
type AuditLogRow = { client_id: string | null };

// Pulled out of the component body — react-hooks/purity flags Date.now()
// (or any current-time read) called directly during a component's own
// render, even a Server Component's, since the lint rule can't tell that
// one only ever runs once per request.
function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

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
      .select("id, business_name, email, website_url, maintenance_plan, created_at, chatbot_embed_enabled, chatbot_embed_allowed_origin")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("organisations")
      .select("is_internal, stripe_connect_charges_enabled")
      .eq("id", membership.orgId)
      .single(),
  ]);

  const thirtyDaysAgo = thirtyDaysAgoIso();
  const clientIds = (clients ?? []).map((c) => c.id);
  const [{ data: invoices }, { data: requests }, { data: siteChecks }, { data: embedChatEvents }] = clientIds.length
    ? await Promise.all([
        supabase
          .from("invoices")
          .select("id, client_id, amount_pence, description, status, due_date, paid_at, stripe_hosted_invoice_url, created_at")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false }),
        supabase.from("requests").select("id, client_id, status").in("client_id", clientIds),
        supabase.from("site_checks").select("client_id, uptime_ok").in("client_id", clientIds),
        // Phase 4 usage visibility — RLS (audit_log_select_embed_chat_own_org,
        // schema-rls-audit-log-embed-chat.sql) scopes this to just this one
        // event type, never any other audit_log content.
        supabase
          .from("audit_log")
          .select("client_id")
          .eq("action", "embed_chat.message")
          .in("client_id", clientIds)
          .gte("created_at", thirtyDaysAgo),
      ])
    : [{ data: [] as InvoiceRow[] }, { data: [] as RequestRow[] }, { data: [] as SiteCheckRow[] }, { data: [] as AuditLogRow[] }];

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await supabase.from("tasks").select("id, request_id, status").in("request_id", requestIds)
    : { data: [] as TaskRow[] };

  const invoicesByClient: Record<string, InvoiceRow[]> = {};
  for (const inv of invoices ?? []) {
    (invoicesByClient[inv.client_id] ??= []).push(inv);
  }

  // Client health score (P1 platform readiness item) — same real, non-
  // fabricated components the client portal already computes for itself
  // (client-health.ts), just rolled up across every client in one place
  // so the agency owner can actually see who needs attention without
  // opening each client's own portal one at a time.
  const healthByClient: Record<string, ClientHealth> = {};
  for (const client of clients ?? []) {
    const clientRequests = (requests ?? []).filter((r) => r.client_id === client.id);
    const clientRequestIds = new Set(clientRequests.map((r) => r.id));
    const clientTasks = (tasks ?? []).filter((t) => t.request_id && clientRequestIds.has(t.request_id));
    const clientInvoices = invoicesByClient[client.id] ?? [];
    const clientSiteChecks = (siteChecks ?? []).filter((s) => s.client_id === client.id);
    healthByClient[client.id] = computeClientHealth(clientRequests, clientTasks, clientInvoices, clientSiteChecks);
  }

  // HamishAI's own internal org invoices on the platform's own Stripe
  // account directly (create-invoice.ts's isInternal branch) — always
  // "ready," no Connect account needed.
  const stripeReady = Boolean(org?.is_internal || org?.stripe_connect_charges_enabled);

  const embedUsageByClient: Record<string, number> = {};
  for (const event of embedChatEvents ?? []) {
    if (!event.client_id) continue;
    embedUsageByClient[event.client_id] = (embedUsageByClient[event.client_id] ?? 0) + 1;
  }

  return (
    <ClientsPanel
      clients={clients ?? []}
      invoicesByClient={invoicesByClient}
      embedUsageByClient={embedUsageByClient}
      healthByClient={healthByClient}
      stripeReady={stripeReady}
    />
  );
}
