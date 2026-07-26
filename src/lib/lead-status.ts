export const LEAD_FOLLOW_UP_DAYS = 5;

export function leadNeedsFollowUp(lead: { status: string; contacted_at: string | null }) {
  if (lead.status !== "contacted" || !lead.contacted_at) return false;
  const daysSince = (Date.now() - new Date(lead.contacted_at).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= LEAD_FOLLOW_UP_DAYS;
}
