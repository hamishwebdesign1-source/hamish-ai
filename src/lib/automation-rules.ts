import { getSupabaseAdmin } from "@/lib/supabase";
import { draftSalesKit } from "@/lib/draft-sales-kit";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isStudioActionRateLimited } from "@/lib/chat-rate-limit";
import { logAuditEvent } from "@/lib/audit-log";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Roadmap item #10 ("no-code automation rules engine") — re-grounded
// before building: a genuinely generic condition/action builder (any
// signal, freely combined with any action) is a real new subsystem of
// its own — a condition DSL, an evaluator, a no-code builder UI, and real
// safety guards against a badly configured rule looping or spamming.
// That's a product/design conversation, not something to invent
// unilaterally while building solo. What ships here instead is the
// roadmap's own concrete example, built for real and made genuinely
// safe: "a prospect scores 4+ and sits untouched for a few days -> a
// follow-up gets drafted automatically." One real rule, opt-in, proving
// the pattern rather than a framework for inventing more of them. A real
// generic engine is the natural next step once this one earns its keep.
//
// Deliberately drafts, never sends — same safety class as
// competitor-intel.ts, one step more conservative than autonomous-
// outreach.ts (item #2), which only ever sends a *follow-up* to someone
// already contacted once by a human. This can fire on a prospect nobody
// has touched yet, so it stays firmly on the "prepare, don't act"
// side of the line: a human still reviews and sends every first-touch
// outreach themselves.

const SCORE_THRESHOLD = 4;
const MIN_AGE_DAYS = 3; // gives a human first crack before automation touches a fresh prospect
const MAX_DRAFTS_PER_ORG_PER_RUN = 5;

// Not yet acted on, in either direction — the same two "hasn't started
// the cadence yet" statuses prospecting-panel.tsx's own status filter
// list already treats as pre-contact.
const ELIGIBLE_STATUSES = ["needs_verification", "qualified"];

type EligibleProspect = { id: string; score: number | null };

export async function runAutoDraftHighScoreProspectsRule() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  // Never HamishAI's own internal org — its own prospecting is a hands-on
  // pipeline by design (draft-sales-kit.ts feeds a human-reviewed Gmail
  // draft, not an automated trigger), same boundary autonomous-outreach.ts
  // and competitor-intel.ts both already draw for the same reason.
  const { data: orgs, error } = await admin.from("organisations").select("id, name, plan, brand").eq("is_internal", false);
  if (error) return { error: "Failed to fetch organisations." as const };

  const cutoffDate = new Date(Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let totalDrafted = 0;
  const byOrg: Record<string, number> = {};

  for (const org of orgs ?? []) {
    const brand = (org.brand ?? {}) as { autoDraftHighScoreProspectsEnabled?: boolean };
    if (!brand.autoDraftHighScoreProspectsEnabled) continue;

    const { data: prospects } = await admin
      .from("prospects")
      .select("id, score")
      .eq("org_id", org.id)
      .in("status", ELIGIBLE_STATUSES)
      .gte("score", SCORE_THRESHOLD)
      .lte("found_at", cutoffDate)
      .not("research", "is", null) // only a genuinely researched prospect — never draft off thin signal/outreach_note text alone
      .is("sales_kit", null)
      .order("score", { ascending: false })
      .limit(MAX_DRAFTS_PER_ORG_PER_RUN);

    let draftedThisOrg = 0;
    for (const p of (prospects ?? []) as EligibleProspect[]) {
      // Same shared per-org AI-action budget every other Studio AI
      // Server Action draws from (chat-rate-limit.ts's own comment) —
      // this automation stopping here for the rest of the run, rather
      // than erroring, means a burst of manual activity this same day
      // simply gets priority over the rest of this org's auto-drafts.
      if (await isStudioActionRateLimited(org.id)) break;

      // The real, plan-metered monthly cap — checked before generating,
      // same as generateSalesKit()'s own session-based check
      // (prospects/actions.ts). Stops for this org once reached rather
      // than failing the whole run; other orgs' own budgets are untouched.
      const usage = await getUsageStatus(org.id, "sales_kit_generated", (org.plan ?? "starter") as PlatformPlanSlug);
      if (!usage.allowed) break;

      const result = await draftSalesKit(p.id, { name: org.name, isInternal: false });
      if (!("kit" in result)) continue;

      await recordUsageEvent(org.id, "sales_kit_generated");
      logAuditEvent({
        actor: org.name,
        actorType: "system",
        action: "prospect.auto_drafted_sales_kit",
        targetType: "prospect",
        targetId: p.id,
        metadata: { orgId: org.id, score: p.score },
      });
      draftedThisOrg++;
    }

    if (draftedThisOrg > 0) {
      byOrg[org.id] = draftedThisOrg;
      totalDrafted += draftedThisOrg;
    }
  }

  return { drafted: totalDrafted, byOrg };
}
