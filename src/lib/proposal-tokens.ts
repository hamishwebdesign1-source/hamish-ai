import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import type { SalesKit } from "@/lib/draft-sales-kit";
import type { RateCardItem } from "@/lib/rate-card";

// Studio big-ticket ("proposal send-and-track workflow") — see
// schema-proposal-tokens.sql for the full design reasoning. Same
// create-token / read-token / consume-token split as
// digest-action-tokens.ts, but "consume" here is "accept", and unlike a
// digest action it's not the only interesting moment — a prospect
// opening the link at all (viewed_at) is itself a real, useful signal
// for the tenant, tracked separately from acceptance.
//
// A proposal's natural shelf life is much longer than a weekly digest
// link's (digest-action-tokens.ts's own 10-day TTL) — a prospect might
// sit on a proposal for weeks before deciding.
const TOKEN_TTL_DAYS = 60;

export async function createProposalToken(
  admin: SupabaseClient,
  params: { orgId: string; prospectId: string; sentTo: string | null }
): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("proposal_tokens").insert({
    token,
    org_id: params.orgId,
    prospect_id: params.prospectId,
    sent_to: params.sentTo,
    expires_at: expiresAt,
  });
  if (error) {
    console.error("Failed to create proposal token:", error);
    return null;
  }
  return token;
}

export type ProposalTokenView = {
  orgName: string;
  accentColor: string | null;
  prospectBusinessName: string;
  proposalOutline: SalesKit["proposal_outline"];
  rateCard: RateCardItem[];
  contactEmail: string | null;
  accepted: boolean;
  expired: boolean;
};

// GET-side lookup, same defensive shape as readDigestActionToken() —
// never marks anything *accepted* here (an email security scanner
// pre-fetching this link would otherwise falsely "accept" a proposal no
// human ever saw). Marking `viewed_at` on a plain read is a much lower
// stakes false positive than a false acceptance would be — a bot hit
// only means a tenant sees "viewed" a little early, nothing is
// consumed or blocked — so it's fine to do fire-and-forget here rather
// than requiring its own confirm step the way acceptProposalToken()
// below does.
export async function readProposalToken(token: string): Promise<ProposalTokenView | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: row } = await admin
    .from("proposal_tokens")
    .select("org_id, prospect_id, accepted_at, expires_at, viewed_at")
    .eq("token", token)
    .maybeSingle();
  if (!row) return null;

  const expired = new Date(row.expires_at) < new Date();

  const [{ data: prospect }, { data: org }] = await Promise.all([
    admin.from("prospects").select("business_name, sales_kit").eq("id", row.prospect_id).maybeSingle(),
    admin.from("organisations").select("name, is_internal, brand").eq("id", row.org_id).single(),
  ]);
  if (!prospect) return null;

  const salesKit = prospect.sales_kit as SalesKit | null;
  if (!salesKit?.proposal_outline) return null;

  const brand = (org?.brand ?? {}) as { accentColor?: string; rateCard?: RateCardItem[]; replyToEmail?: string };
  const orgName = org && !org.is_internal ? org.name : "Hamish AI";

  if (!expired && !row.viewed_at) {
    admin
      .from("proposal_tokens")
      .update({ viewed_at: new Date().toISOString() })
      .eq("token", token)
      .is("viewed_at", null)
      .then(({ error }) => {
        if (error) console.error(`Failed to mark proposal token viewed (token ${token}):`, error);
      });
  }

  return {
    orgName,
    accentColor: brand.accentColor ?? null,
    prospectBusinessName: prospect.business_name,
    proposalOutline: salesKit.proposal_outline,
    rateCard: brand.rateCard ?? [],
    contactEmail: brand.replyToEmail ?? null,
    accepted: Boolean(row.accepted_at),
    expired,
  };
}

export type AcceptResult = { ok: true } | { error: string };

// POST-side only, reached exclusively via the page's own "Accept this
// proposal" button submit — never the GET render above. Idempotent by
// design (checks accepted_at before writing, same is()-guarded update
// shape as consumeDigestActionToken()) so a slow-network retry or a
// second tab can't double-fire whatever the tenant's own next step is.
export async function acceptProposalToken(token: string): Promise<AcceptResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: row } = await admin.from("proposal_tokens").select("org_id, prospect_id, accepted_at, expires_at").eq("token", token).maybeSingle();
  if (!row) return { error: "This link isn't valid." };
  if (new Date(row.expires_at) < new Date()) return { error: "This link has expired." };
  if (row.accepted_at) return { ok: true };

  const { error } = await admin
    .from("proposal_tokens")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token)
    .is("accepted_at", null);
  if (error) return { error: "Failed to record your acceptance — try again." };

  // Big-ticket #5 ("acceptance never notifies the agency") — sent/
  // viewed/accepted only ever showed up as a passive badge on the
  // Prospects page (prospects/page.tsx's own proposal_tokens read); the
  // single hottest signal this whole pipeline produces could sit
  // unnoticed for days. Deliberately NOT a notification on `viewed_at`
  // too — the badge already covers that softer, noisier signal well
  // enough (readProposalToken()'s own comment on why a bot pre-fetch
  // marking it viewed early is low-stakes); acceptance is the one worth
  // an active push. Fire-and-forget, same convention as every other
  // notification send in this app.
  notifyProposalAccepted(admin, row.org_id, row.prospect_id);

  return { ok: true };
}

async function notifyProposalAccepted(admin: SupabaseClient, orgId: string, prospectId: string): Promise<void> {
  const [{ data: prospect }, { data: org }] = await Promise.all([
    admin.from("prospects").select("business_name, assigned_to").eq("id", prospectId).maybeSingle(),
    admin.from("organisations").select("name").eq("id", orgId).maybeSingle(),
  ]);
  if (!prospect) return;
  const orgName = org?.name ?? "your workspace";

  // Whoever's actually chasing this lead (prospects.assigned_to, this
  // session's own team-collaboration work) hears about it first, same
  // "the assignee is the most relevant person" reasoning
  // notifyAssignee() (team-members.ts) already applies. Falls back to
  // the org's own owners (same recipient set owner-digest.ts already
  // uses) when nobody's specifically on it yet.
  let recipients: string[];
  if (prospect.assigned_to) {
    recipients = [prospect.assigned_to];
  } else {
    const { data: owners } = await admin.from("memberships").select("email").eq("org_id", orgId).eq("role", "owner").not("accepted_at", "is", null);
    recipients = (owners ?? []).map((o) => o.email).filter((e): e is string => Boolean(e));
  }

  const subject = `${prospect.business_name} accepted your proposal`;
  const text = `Hi,\n\n${prospect.business_name} just accepted the proposal you sent them via ${orgName} on Hamish AI's Agency Platform.\n\nFollow up here:\nhttps://hamishai.org/studio/prospects\n\n— Hamish AI`;
  for (const email of recipients) {
    await sendClientEmail(email, subject, text);
  }
}
