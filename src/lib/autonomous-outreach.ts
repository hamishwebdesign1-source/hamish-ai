import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getLeadCadenceAction } from "@/lib/lead-status";
import { sendOrgEmail } from "@/lib/send-org-email";
import { logAuditEvent } from "@/lib/audit-log";
import type { SalesKit } from "@/lib/draft-sales-kit";

// Roadmap item #2 ("autonomous outreach cadence") — the piece the
// original brief called out as blocked on tenant-scoped outbound email
// (item #1, send-org-email.ts, now shipped). This does NOT invent a new
// cadence: it automates exactly one already-modelled step of
// lead-status.ts's real email -> call -> follow_up cadence, and only that
// one. "call" (5 days after the initial email, no reply) can't be
// automated — it's a phone call — so it stays a human action in the
// Command Centre queue exactly as before. "follow_up" (7 days after that
// call, still no reply) *is* a plain email send, using content a human
// already approved by generating the sales kit in the first place — that's
// what's automated here, per-org, opt-in only.
//
// Deliberately opt-in per org (organisations.brand.autonomousOutreachEnabled,
// same jsonb column as replyToEmail) and hard-gated on a reply-to email
// already being configured — sendOrgEmail() would refuse anyway without
// one, but checking here means a misconfigured org shows up as "0 sent"
// in the cron summary instead of a wall of per-prospect errors.
//
// Folded into the existing daily trial-reminders cron rather than given
// its own vercel.json entry — same "architecturally the same shape, cron
// count is worth conserving" reasoning that cron's own header already
// documents for usage-warnings.

const MAX_AUTO_SENDS_PER_ORG_PER_RUN = 5;

type CadenceProspectRow = {
  id: string;
  business_name: string;
  email: string | null;
  status: string;
  contacted_at: string | null;
  last_contact_method: string | null;
  replied_at: string | null;
  sales_kit: SalesKit | null;
};

async function sendForOrg(
  admin: SupabaseClient,
  org: { id: string; name: string; replyToEmail: string },
  now: Date
): Promise<{ sent: number; skippedNoSalesKit: number }> {
  const { data: prospects } = await admin
    .from("prospects")
    .select("id, business_name, email, status, contacted_at, last_contact_method, replied_at, sales_kit")
    .eq("org_id", org.id)
    .eq("status", "contacted")
    .not("email", "is", null)
    .is("replied_at", null);

  let sent = 0;
  let skippedNoSalesKit = 0;

  for (const p of (prospects ?? []) as CadenceProspectRow[]) {
    if (sent >= MAX_AUTO_SENDS_PER_ORG_PER_RUN) break;
    if (getLeadCadenceAction(p) !== "follow_up") continue;

    const followUp = p.sales_kit?.follow_up_email;
    if (!followUp?.subject || !followUp?.body) {
      // Genuinely due, but nothing a human ever approved to send — stays
      // visible in the Command Centre queue/briefing exactly as before,
      // this just never invents content to fill the gap.
      skippedNoSalesKit++;
      continue;
    }
    if (!p.email) continue;

    const result = await sendOrgEmail({
      orgId: org.id,
      orgName: org.name,
      replyToEmail: org.replyToEmail,
      to: p.email,
      subject: followUp.subject,
      text: followUp.body,
    });
    if ("error" in result) {
      console.error(`Autonomous follow-up failed for prospect ${p.id} (org ${org.id}):`, result.error);
      continue;
    }

    // Resets the cadence clock the exact same way a human clicking
    // "contacted" does — last_contact_method: "email" means the *next*
    // due action (lead-status.ts) is "call" again, five days out. That's
    // correct: this only ever automates the one email-sendable step, and
    // hands straight back to a human for the step that needs one.
    await admin
      .from("prospects")
      .update({ contacted_at: now.toISOString(), last_contact_method: "email" })
      .eq("id", p.id)
      .eq("org_id", org.id);

    await logAuditEvent({
      actor: org.name,
      actorType: "system",
      action: "prospect.autonomous_follow_up_sent",
      targetType: "prospect",
      targetId: p.id,
      metadata: { orgId: org.id },
    });

    sent++;
  }

  return { sent, skippedNoSalesKit };
}

export async function sendAutonomousFollowUps(now = new Date()) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  // Never HamishAI's own internal org — its lead pipeline is deliberately
  // Gmail-draft-then-human-sends (draft-sales-kit.ts / gmail-draft.ts),
  // not sendOrgEmail(); that's a different, more manual design on purpose,
  // not a gap this should paper over.
  const { data: orgs, error } = await admin.from("organisations").select("id, name, brand").eq("is_internal", false);
  if (error) return { error: "Failed to fetch organisations." as const };

  let totalSent = 0;
  const byOrg: Record<string, number> = {};

  for (const org of orgs ?? []) {
    const brand = (org.brand ?? {}) as { autonomousOutreachEnabled?: boolean; replyToEmail?: string };
    if (!brand.autonomousOutreachEnabled || !brand.replyToEmail) continue;

    const { sent } = await sendForOrg(admin, { id: org.id, name: org.name, replyToEmail: brand.replyToEmail }, now);
    if (sent > 0) {
      byOrg[org.id] = sent;
      totalSent += sent;
    }
  }

  return { sent: totalSent, byOrg };
}
