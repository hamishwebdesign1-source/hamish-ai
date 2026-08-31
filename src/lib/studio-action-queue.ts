import { timeAgo } from "@/lib/time-ago";
import type { FollowUpDue } from "@/lib/studio-briefing";

// Command Centre improvement #1 ("cleared queue, not a dashboard") — the
// real, per-item successor to the old actions_required card, which only
// ever showed 3 aggregate counts ("2 follow-ups", "1 overdue project")
// each linking out to go handle it manually. This is the same "one real
// row per real fact" discipline studio-client-activity.ts already
// established for Recent activity, applied to the signals that are
// actually actionable in place rather than just informational — each row
// here is one specific prospect/request/project, wired to the one-click
// action (command-centre-section-cards.tsx's QueueItemAction) that
// actually clears it, the same "recommend -> act" precedent
// TopOpportunityKitAction and SendInvoiceReminderAction already shipped
// for the other two Command Centre cards.

export type ActionQueueKind = "follow_up" | "unanswered_request" | "overdue_project";

export type ActionQueueItem = {
  id: string; // the real prospect/request/project id — what the clearing action needs
  kind: ActionQueueKind;
  businessName: string;
  detail: string;
  href: string;
};

export type QueueRequestRow = { id: string; client_id: string; raw_text: string; responded_at: string | null };
export type QueueProjectRow = { id: string; client_id: string; name: string; status: string; target_date: string | null };
export type QueueClientRow = { id: string; business_name: string };

// A "today" list, not the full backlog — same MAX_ACTIVITY_ITEMS reasoning
// as Recent activity: the linked pages (Prospects/Requests/Projects)
// still hold everything else. The header's own "N things need your
// attention" line (page.tsx's actionsTotal) stays the real, uncapped
// count regardless of how many rows actually render here.
const MAX_QUEUE_ITEMS = 8;

function truncate(text: string, max: number): string {
  const trimmed = (text ?? "").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function computeActionQueue(
  followUpsDueList: FollowUpDue[],
  requests: QueueRequestRow[],
  projects: QueueProjectRow[],
  clients: QueueClientRow[],
  today: string
): ActionQueueItem[] {
  const businessNameById = new Map(clients.map((c) => [c.id, c.business_name]));
  const items: ActionQueueItem[] = [];

  for (const f of followUpsDueList) {
    items.push({
      id: f.id,
      kind: "follow_up",
      businessName: f.businessName,
      detail: f.nextAction === "call" ? "Due a call" : "Due one more follow-up",
      href: "/studio/prospects",
    });
  }

  for (const r of requests) {
    if (r.responded_at) continue;
    const businessName = businessNameById.get(r.client_id);
    if (!businessName) continue;
    items.push({
      id: r.id,
      kind: "unanswered_request",
      businessName,
      detail: truncate(r.raw_text, 70),
      href: "/studio/requests",
    });
  }

  for (const p of projects) {
    if (p.status !== "active" || !p.target_date || p.target_date >= today) continue;
    const businessName = businessNameById.get(p.client_id);
    if (!businessName) continue;
    items.push({
      id: p.id,
      kind: "overdue_project",
      businessName,
      detail: `${p.name} — target date was ${timeAgo(new Date(p.target_date).toISOString())}`,
      href: "/studio/projects",
    });
  }

  return items.slice(0, MAX_QUEUE_ITEMS);
}
