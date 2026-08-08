// Shared between /admin/leads (the list) and /admin/leads/[id] (the detail
// page introduced in the portal redesign's Stage 4) — was previously
// defined only inside the list page, duplicated nowhere until the detail
// page needed the same status labels/audit descriptions.

export const STATUSES = ["needs_verification", "ready", "contacted", "not_fit"] as const;

export const statusMeta: Record<(typeof STATUSES)[number], { label: string; variant: "warning" | "success" | "accent" | "secondary" }> = {
  needs_verification: { label: "Needs verification", variant: "warning" },
  ready: { label: "Ready for outreach", variant: "success" },
  contacted: { label: "Contacted", variant: "accent" },
  not_fit: { label: "Not a good fit", variant: "secondary" },
};

export type AuditEntry = { action: string; created_at: string; metadata: Record<string, unknown> | null };

export function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// 30+ days with no logged activity, still sitting in one of the two
// "not yet actioned" statuses — everything past that point is either
// contacted, not a fit, or moving fast enough that it isn't stale.
// "Last touched" is the most recent audit_log entry if one exists,
// falling back to when the row was first found.
export function isStaleLead(lead: { status: string; created_at: string }, entries: AuditEntry[] | undefined) {
  if (lead.status !== "needs_verification" && lead.status !== "ready") return false;
  const lastTouched = entries?.[0]?.created_at ?? lead.created_at;
  return daysSince(lastTouched) >= 30;
}

export function websiteHref(website: string) {
  return website.startsWith("http") ? website : `https://${website.split(" ")[0]}`;
}

// One short, human-readable line per audit_log action — the raw
// "lead.email_drafted" strings are for filtering/analytics, not for
// reading, so the timeline renders a translated version instead.
export function describeAuditEntry(entry: AuditEntry): string {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case "lead.created":
      return "Lead added";
    case "lead.status_changed":
      return `Status changed to "${statusMeta[meta.to as keyof typeof statusMeta]?.label ?? meta.to}"`;
    case "lead.called":
      return "Marked as called";
    case "lead.email_marked_sent":
      return "Marked email as sent (manual)";
    case "lead.email_sent_confirmed":
      return `Email send confirmed (${meta.via === "cron_sweep" ? "daily check" : "manual check"})`;
    case "lead.replied":
      return "Marked as replied";
    case "lead.email_drafted":
      return meta.saved_to_gmail ? "Email drafted and saved to Gmail" : "Email drafted (not saved to Gmail)";
    case "lead.call_script_drafted":
      return "Call script drafted";
    case "lead.sales_kit_generated":
      return "Sales kit generated (email, call script, LinkedIn, agenda, proposal)";
    case "lead.discovered":
      return `AI-discovered — ${meta.why_suggested ?? "found by the weekly discovery search"}`;
    case "lead.meeting_scheduled":
      return meta.scheduled_start
        ? `Teams meeting scheduled for ${new Date(meta.scheduled_start as string).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`
        : "Teams meeting scheduled";
    case "lead.researched":
      return `Researched — score set to ${meta.score}, AI fit ${meta.ai_opportunity_fit}`;
    case "lead.notes_updated":
      return `Note added: "${meta.notes}"`;
    case "lead.email_updated":
      return meta.email ? `Contact email set to ${meta.email}` : "Contact email cleared";
    case "lead.phone_updated":
      return meta.phone ? `Contact phone set to ${meta.phone}` : "Contact phone cleared";
    case "lead.concept_slug_updated":
      return meta.concept_slug ? `Linked to concept page "${meta.concept_slug}"` : "Concept page link removed";
    default:
      return entry.action;
  }
}

// Communications-specific subset of the actions above — the brief's
// "Communications" section on the lead detail page, without inventing a
// separate email-log data model: every real communications event already
// gets logged to audit_log via the same logAuditEvent() calls.
export const COMMUNICATION_ACTIONS = new Set([
  "lead.email_drafted",
  "lead.call_script_drafted",
  "lead.email_marked_sent",
  "lead.email_sent_confirmed",
  "lead.called",
  "lead.replied",
]);
