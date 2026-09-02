import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";

export type FlaggedClient = {
  businessName: string;
  websiteUrl: string;
  reasons: string[];
  aiSummary: string | null;
  // Studio big-ticket ("site-check alerts never reach the tenant") —
  // the daily cron already queries every org's clients (no org_id
  // filter on the clients query in site-checks/route.ts), but this
  // whole module only ever emailed one hardcoded operator address. A
  // tenant's own client's site going down was invisible to the tenant
  // who's actually responsible for that relationship — every other
  // real-time signal this session added (assignments, new leads,
  // proposal acceptance) reaches the right org; this one never did.
  orgId: string | null;
};

// Same Resend pattern already established in src/lib/save-lead.ts — one
// consolidated email per cron run per recipient, not one per flagged
// client, so a bad morning doesn't turn into an inbox flood.
async function sendOperatorAlert(flagged: FlaggedClient[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Site check alerts (RESEND_API_KEY not set, not emailed):", flagged);
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env.CONTACT_TO_EMAIL || siteConfig.email;

  const body = flagged
    .map(
      (f) =>
        `${f.businessName} (${f.websiteUrl})\nIssues: ${f.reasons.join(", ")}\n${f.aiSummary || ""}`
    )
    .join("\n\n---\n\n");

  const { error } = await resend.emails.send({
    from: "Hamish AI <onboarding@resend.dev>",
    to: toEmail,
    subject: `Site check alert: ${flagged.length} client${flagged.length === 1 ? "" : "s"} need attention`,
    text: `The daily website health check found issues for ${flagged.length} client${flagged.length === 1 ? "" : "s"}:\n\n${body}`,
  });

  if (error) {
    console.error("Resend site alert email failed:", error);
  }
}

// A tenant org's own team, about their own clients — same
// sendClientEmail()/recipient-set reasoning as owner-digest.ts and this
// session's own notifyAssignee()/notifyProposalAccepted()/
// notifyNewEmbedLead(): HamishAI genuinely notifying a workspace about
// their own Studio activity, not the tenant's own outbound identity.
async function notifyOrgOfSiteAlerts(orgId: string, orgName: string, flagged: FlaggedClient[]): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { data: owners } = await admin.from("memberships").select("email").eq("org_id", orgId).eq("role", "owner").not("accepted_at", "is", null);
  const recipients = (owners ?? []).map((o) => o.email).filter((e): e is string => Boolean(e));
  if (!recipients.length) return;

  const body = flagged
    .map((f) => `${f.businessName} (${f.websiteUrl})\nIssues: ${f.reasons.join(", ")}\n${f.aiSummary || ""}`)
    .join("\n\n---\n\n");
  const subject = `Site check alert: ${flagged.length} client${flagged.length === 1 ? "" : "s"} need attention`;
  const text = `Hi,\n\nToday's website health check found issues for ${flagged.length} of your client${flagged.length === 1 ? "" : "s"} in ${orgName}:\n\n${body}\n\nView details in Studio → Clients.\n\n— Hamish AI`;

  for (const email of recipients) {
    await sendClientEmail(email, subject, text);
  }
}

// Split by which org each flagged client actually belongs to —
// HamishAI's own internal org keeps going to the operator inbox exactly
// as before (unchanged behaviour), every real tenant org's own flagged
// clients now reach that org's own team instead of silently only ever
// reaching Hamish.
export async function sendSiteAlertEmail(flagged: FlaggedClient[]) {
  if (flagged.length === 0) return;

  const admin = getSupabaseAdmin();
  const orgIds = [...new Set(flagged.map((f) => f.orgId).filter((id): id is string => Boolean(id)))];
  const { data: orgs } = admin && orgIds.length ? await admin.from("organisations").select("id, name, is_internal").in("id", orgIds) : { data: [] };
  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));

  const internalFlagged: FlaggedClient[] = [];
  const byTenantOrg = new Map<string, FlaggedClient[]>();

  for (const f of flagged) {
    const org = f.orgId ? orgById.get(f.orgId) : null;
    if (!org || org.is_internal) {
      internalFlagged.push(f);
    } else {
      const list = byTenantOrg.get(f.orgId!) ?? [];
      list.push(f);
      byTenantOrg.set(f.orgId!, list);
    }
  }

  if (internalFlagged.length) await sendOperatorAlert(internalFlagged);

  for (const [orgId, orgFlagged] of byTenantOrg) {
    const org = orgById.get(orgId);
    if (org) await notifyOrgOfSiteAlerts(orgId, org.name, orgFlagged);
  }
}
