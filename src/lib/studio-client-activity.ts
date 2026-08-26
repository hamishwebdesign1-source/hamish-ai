// Command Centre improvement #8 (Recent activity) — a merged, real feed
// of what's actually happened across an org's client roster. Built
// entirely from rows page.tsx already fetches for other sections
// (Business Health, Engagement Risk) — no new query, same "reuse what's
// already real" discipline as computeClientEngagementRisk(). Every item
// here is a real, dated fact off requests/invoices/projects/clients,
// never a derived or predicted state — a project's only real timestamp
// is when it started (projects has no completed_at), so "completed" is
// deliberately not one of the event kinds below rather than guessed
// from a status flip with no date attached to it.

export type ClientActivityKind = "client_joined" | "request_received" | "request_responded" | "invoice_paid" | "project_started";

export type ClientActivityItem = {
  id: string;
  kind: ClientActivityKind;
  clientId: string;
  businessName: string;
  detail: string;
  occurredAt: string; // ISO
};

export type ActivityClientRow = { id: string; business_name: string; created_at: string };
export type ActivityRequestRow = { id: string; client_id: string; raw_text: string; created_at: string; responded_at: string | null };
export type ActivityInvoiceRow = { id: string; client_id: string; amount_pence: number; description: string; paid_at: string | null };
export type ActivityProjectRow = { id: string; client_id: string; name: string; created_at: string };

const MAX_ACTIVITY_ITEMS = 8;

function truncate(text: string, max: number): string {
  const trimmed = (text ?? "").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function computeRecentClientActivity(
  clients: ActivityClientRow[],
  requests: ActivityRequestRow[],
  invoices: ActivityInvoiceRow[],
  projects: ActivityProjectRow[]
): ClientActivityItem[] {
  const businessNameById = new Map(clients.map((c) => [c.id, c.business_name]));
  const items: ClientActivityItem[] = [];

  for (const c of clients) {
    items.push({ id: `client:${c.id}`, kind: "client_joined", clientId: c.id, businessName: c.business_name, detail: "Became a client", occurredAt: c.created_at });
  }

  for (const r of requests) {
    const businessName = businessNameById.get(r.client_id);
    if (!businessName) continue;
    items.push({
      id: `request:${r.id}`,
      kind: "request_received",
      clientId: r.client_id,
      businessName,
      detail: truncate(r.raw_text, 80),
      occurredAt: r.created_at,
    });
    if (r.responded_at) {
      items.push({
        id: `request-response:${r.id}`,
        kind: "request_responded",
        clientId: r.client_id,
        businessName,
        detail: `Replied — ${truncate(r.raw_text, 60)}`,
        occurredAt: r.responded_at,
      });
    }
  }

  for (const inv of invoices) {
    if (!inv.paid_at) continue;
    const businessName = businessNameById.get(inv.client_id);
    if (!businessName) continue;
    items.push({
      id: `invoice:${inv.id}`,
      kind: "invoice_paid",
      clientId: inv.client_id,
      businessName,
      detail: `Paid £${(inv.amount_pence / 100).toFixed(2)} — ${inv.description}`,
      occurredAt: inv.paid_at,
    });
  }

  for (const p of projects) {
    const businessName = businessNameById.get(p.client_id);
    if (!businessName) continue;
    items.push({
      id: `project:${p.id}`,
      kind: "project_started",
      clientId: p.client_id,
      businessName,
      detail: `New project — ${p.name}`,
      occurredAt: p.created_at,
    });
  }

  items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return items.slice(0, MAX_ACTIVITY_ITEMS);
}
