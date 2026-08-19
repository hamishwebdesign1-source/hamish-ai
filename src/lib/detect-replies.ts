import { getSupabaseAdmin } from "@/lib/supabase";
import { getTenantGraphAccessToken } from "@/lib/tenant-graph-auth";

// V1 of automatic reply detection: on-demand only, triggered from
// /studio/settings, not a background cron — see the "Inbox Reply
// Detection" scoping note for why. One Graph query per contacted,
// not-yet-replied prospect with a known email address; a match sets
// replied_at, the exact same field the manual "Mark as replied" button
// writes, so lead-status.ts's cadence logic and the briefing count don't
// need to know this happened automatically.
//
// Read-only and narrow on purpose: this only ever asks "does a message
// from this specific address exist after this date," never reads or
// stores a message's subject or body.

export type ReplyCheckResult = { checked: number; matched: number } | { error: string };

type ContactedProspect = { id: string; email: string | null; contacted_at: string | null };

export async function checkForReplies(orgId: string): Promise<ReplyCheckResult> {
  const tokenResult = await getTenantGraphAccessToken(orgId);
  if ("error" in tokenResult) return { error: tokenResult.error };

  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: prospects, error: fetchError } = await admin
    .from("prospects")
    .select("id, email, contacted_at")
    .eq("org_id", orgId)
    .eq("status", "contacted")
    .is("replied_at", null)
    .not("email", "is", null)
    .not("contacted_at", "is", null);
  if (fetchError) return { error: "Failed to load prospects to check." };

  const candidates = (prospects ?? []) as ContactedProspect[];
  let matched = 0;

  for (const prospect of candidates) {
    if (!prospect.email || !prospect.contacted_at) continue;

    const escapedEmail = prospect.email.replace(/'/g, "''");
    const filter = `receivedDateTime ge ${prospect.contacted_at} and from/emailAddress/address eq '${escapedEmail}'`;
    const url = `https://graph.microsoft.com/v1.0/me/messages?${new URLSearchParams({
      $filter: filter,
      $top: "1",
      $select: "id,receivedDateTime",
    }).toString()}`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          // Required by Graph for filtering on a nested property
          // (from/emailAddress/address) rather than a top-level one.
          ConsistencyLevel: "eventual",
        },
      });
    } catch (error) {
      console.error(`Reply check failed to reach Graph for prospect ${prospect.id}:`, error);
      continue;
    }

    if (!res.ok) {
      console.error(`Reply check failed for prospect ${prospect.id}:`, await res.text());
      continue;
    }

    const json = (await res.json()) as { value?: { receivedDateTime: string }[] };
    const found = json.value?.[0];
    if (found) {
      const { error: updateError } = await admin
        .from("prospects")
        .update({ replied_at: found.receivedDateTime })
        .eq("id", prospect.id)
        .eq("org_id", orgId);
      if (!updateError) matched++;
    }
  }

  await admin
    .from("email_connections")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("provider", "microsoft");

  return { checked: candidates.length, matched };
}
