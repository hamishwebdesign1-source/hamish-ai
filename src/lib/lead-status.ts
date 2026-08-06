// Email → wait → call cadence: an email with no reply after
// EMAIL_TO_CALL_DAYS prompts a phone call; a call with no reply after
// CALL_FOLLOWUP_DAYS prompts one last follow-up (or parking the lead).
// A reply at any point (`replied_at` set) takes a lead out of the
// cadence entirely — see schema-lead-cadence.sql for the columns this
// reads.
export const EMAIL_TO_CALL_DAYS = 5;
export const CALL_FOLLOWUP_DAYS = 7;

export type Lead = {
  status: string;
  contacted_at: string | null;
  last_contact_method?: string | null;
  replied_at?: string | null;
};

export type LeadCadenceAction = "call" | "follow_up" | null;

function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// What (if anything) is due next for this lead. Legacy rows with a
// contacted_at but no last_contact_method (set before this cadence
// existed) fall back to the email cadence, the more conservative of
// the two thresholds.
export function getLeadCadenceAction(lead: Lead): LeadCadenceAction {
  if (lead.status !== "contacted" || !lead.contacted_at || lead.replied_at) return null;

  const since = daysSince(lead.contacted_at);
  if (lead.last_contact_method === "call") {
    return since >= CALL_FOLLOWUP_DAYS ? "follow_up" : null;
  }
  return since >= EMAIL_TO_CALL_DAYS ? "call" : null;
}

// Kept as a simple boolean for anywhere that only needs "is something
// due", e.g. the leads-list stat card and ?status=needs_followup filter.
export function leadNeedsFollowUp(lead: Lead) {
  return getLeadCadenceAction(lead) !== null;
}
