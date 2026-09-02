import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { ClientsPanel } from "@/components/platform/clients-panel";
import { computeClientHealth, type ClientHealth } from "@/lib/client-health";
import { computeClientEngagementRisk, type ClientEngagementRisk } from "@/lib/studio-engagement";

// reminder_sent_at added for Engagement Risk's "Send payment reminder"
// action (studio-engagement.ts) — every other column here was already
// fetched for computeClientHealth().
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
  reminder_sent_at: string | null;
};

// created_at added for Engagement Risk (studio-engagement.ts) — every
// other column here was already fetched for computeClientHealth().
type RequestRow = { id: string; client_id: string; status: string; created_at: string };
type TaskRow = { id: string; request_id: string | null; status: string };
type SiteCheckRow = { client_id: string; uptime_ok: boolean | null };
type AuditLogRow = { client_id: string | null };
// Studio big-ticket #6 ("embedded chatbot has no lead-capture path").
type EmbedLeadRow = { id: string; client_id: string; email: string; message: string | null; created_at: string };
// Studio big-ticket ("client portal self-serve team management").
type ClientMemberRow = { id: string; client_id: string; email: string; role: "owner" | "member"; accepted_at: string | null };

// Pulled out of the component body — react-hooks/purity flags Date.now()
// (or any current-time read) called directly during a component's own
// render, even a Server Component's, since the lint rule can't tell that
// one only ever runs once per request.
function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

// Same react-hooks/purity reasoning as thirtyDaysAgoIso() above —
// computeClientEngagementRisk() (reused from the Command Centre, Phase 6c)
// needs the real Date, not just a date-only string.
function nowDate(): Date {
  return new Date();
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

  // Same bug class as the Command Centre's own fix (page.tsx, "your
  // agency" greeting) and Settings' own (settings/page.tsx) — a wide,
  // all-or-nothing .single() select pairing a foundational column
  // (is_internal) with a newer, migration-dependent one
  // (stripe_connect_charges_enabled) means one missing migration takes
  // the whole row down, including is_internal, which several checks on
  // this page depend on. is_internal split into its own narrow,
  // always-safe query; stripe_connect_charges_enabled stays best-effort
  // and defaults to false (not "internal") if it fails — the correct
  // fail-closed direction, since stripeReady below is an OR of the two.
  const [{ data: clients }, { data: coreOrg }, { data: stripeOrg, error: stripeOrgError }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, business_name, email, website_url, maintenance_plan, created_at, chatbot_embed_enabled, chatbot_embed_allowed_origin, maintenance_monthly_pence, stripe_subscription_id, subscription_status"
      )
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    supabase.from("organisations").select("is_internal").eq("id", membership.orgId).maybeSingle(),
    supabase.from("organisations").select("stripe_connect_charges_enabled").eq("id", membership.orgId).maybeSingle(),
  ]);
  if (stripeOrgError) {
    console.error("Studio Clients: stripe_connect_charges_enabled failed to load (likely a column missing a migration):", stripeOrgError);
  }
  const org = { ...coreOrg, ...stripeOrg };

  const thirtyDaysAgo = thirtyDaysAgoIso();
  const clientIds = (clients ?? []).map((c) => c.id);
  const [{ data: invoices }, { data: requests }, { data: siteChecks }, { data: embedChatEvents }, { data: embedLeads }, { data: clientMembers }] = clientIds.length
    ? await Promise.all([
        // reminder_sent_at added alongside the Command Centre's own
        // invoices query (Engagement Risk's "Send payment reminder" —
        // studio-engagement.ts) — computeClientEngagementRisk() is shared
        // between both pages and now needs it on every invoice row.
        supabase
          .from("invoices")
          .select("id, client_id, amount_pence, description, status, due_date, paid_at, stripe_hosted_invoice_url, created_at, reminder_sent_at")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false }),
        supabase.from("requests").select("id, client_id, status, created_at").in("client_id", clientIds),
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
        // Studio big-ticket #6 — embed_leads_select_own_org RLS
        // (schema-embed-leads.sql) enforces the org boundary
        // independently of this .in() getting it right, same
        // convention as every other read on this page.
        supabase
          .from("embed_leads")
          .select("id, client_id, email, message, created_at")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false }),
        // Studio big-ticket ("client portal self-serve team management")
        // — client_members_select_own_org RLS
        // (schema-rls-client-members-org-staff.sql) enforces the org
        // boundary independently of this .in() getting it right, same
        // convention as every other read on this page.
        supabase
          .from("client_members")
          .select("id, client_id, email, role, accepted_at")
          .in("client_id", clientIds),
      ])
    : [
        { data: [] as InvoiceRow[] },
        { data: [] as RequestRow[] },
        { data: [] as SiteCheckRow[] },
        { data: [] as AuditLogRow[] },
        { data: [] as EmbedLeadRow[] },
        { data: [] as ClientMemberRow[] },
      ];

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

  // Studio big-ticket #6 ("embedded chatbot has no lead-capture path").
  const embedLeadsByClient: Record<string, EmbedLeadRow[]> = {};
  for (const lead of embedLeads ?? []) {
    (embedLeadsByClient[lead.client_id] ??= []).push(lead);
  }

  // Studio big-ticket ("client portal self-serve team management").
  const membersByClient: Record<string, ClientMemberRow[]> = {};
  for (const member of clientMembers ?? []) {
    (membersByClient[member.client_id] ??= []).push(member);
  }

  // Engagement risk (reused from the Command Centre, studio-engagement.ts)
  // — the dashboard's own Engagement risk card caps at 5 and points here
  // ("+N more at risk — see Clients for the full list"), but until now
  // this page had no risk indicator at all, so that link led nowhere
  // useful. Same computation, same real signals (quiet weeks, overdue
  // invoice), keyed by client id for the panel to look up per row.
  const engagementRisks = computeClientEngagementRisk(clients ?? [], requests ?? [], invoices ?? [], nowDate());
  const riskByClient: Record<string, ClientEngagementRisk> = {};
  for (const risk of engagementRisks) {
    riskByClient[risk.clientId] = risk;
  }

  // Roadmap item #7 — client_competitor_intel_select_own_org RLS
  // (schema-client-competitor-intel.sql) enforces the same org boundary
  // independently of this .eq() getting it right. Capped to the 3 most
  // recent per client client-side (a plain filter, not a real per-group
  // limit — Postgres doesn't have one without a window function, and this
  // is a small enough table per org that fetching all of an org's own
  // rows and slicing here is simpler than one).
  const { data: competitorIntel } = clientIds.length
    ? await supabase
        .from("client_competitor_intel")
        .select("client_id, headline, detail, source_url, created_at")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
    : { data: [] as { client_id: string; headline: string; detail: string; source_url: string | null; created_at: string }[] };

  const MAX_INTEL_PER_CLIENT = 3;
  const competitorIntelByClient: Record<string, { headline: string; detail: string; sourceUrl: string | null; createdAt: string }[]> = {};
  for (const row of competitorIntel ?? []) {
    const existing = (competitorIntelByClient[row.client_id] ??= []);
    if (existing.length >= MAX_INTEL_PER_CLIENT) continue;
    existing.push({ headline: row.headline, detail: row.detail, sourceUrl: row.source_url, createdAt: row.created_at });
  }

  return (
    <ClientsPanel
      clients={clients ?? []}
      invoicesByClient={invoicesByClient}
      embedUsageByClient={embedUsageByClient}
      embedLeadsByClient={embedLeadsByClient}
      membersByClient={membersByClient}
      healthByClient={healthByClient}
      riskByClient={riskByClient}
      competitorIntelByClient={competitorIntelByClient}
      stripeReady={stripeReady}
    />
  );
}
