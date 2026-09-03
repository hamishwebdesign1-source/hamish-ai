"use server";

import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { answerStudioQuestion } from "@/lib/answer-studio-question";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import { isRateLimited } from "@/lib/chat-rate-limit";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

// Top-level authed Server Action, not scoped to one subpage — same
// convention as command-search-actions.ts and tour-actions.ts, the other
// two Server Actions that back something rendered across the whole
// (authed) shell rather than one page's own panel.

// Same session-derivation as every other /studio actions.ts file.
async function requireOrgId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) throw new Error("Not signed in.");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) throw new Error("No organisation found for this session.");
  return membership.orgId;
}

// Backs the global Studio AI Assistant widget (studio-assistant-widget.tsx,
// rendered once in (authed)/layout.tsx), the command palette's Ask flow
// (studio-command-palette.tsx), and — since the Clients page's own
// embedded ClientsCopilot was retired (Studio Design Audit, Tier 2 item
// #5) — the Clients page too. One rate limit bucket
// (`studio-assistant:${orgId}`) and one usage event type
// (studio_assistant_question) for all three call sites; the narrower
// clients_copilot_question meter that used to exist alongside this one
// was retired in the same pass rather than kept as a second, redundant
// cap on the same underlying feature. See docs/ai-team/DECISIONS.md.
export async function askStudioAssistant(messages: { role: "user" | "assistant"; content: string }[]) {
  const orgId = await requireOrgId();
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." };

  const { data: org } = await admin.from("organisations").select("name, plan, is_internal").eq("id", orgId).single();
  if (!org) return { error: "Organisation not found." };

  if (!org.is_internal) {
    if (await isRateLimited(`studio-assistant:${orgId}`)) {
      return { error: "Too many questions in a short time — try again in a few minutes." };
    }

    const usage = await getUsageStatus(orgId, "studio_assistant_question", org.plan as PlatformPlanSlug);
    if (!usage.allowed) {
      return { error: `Monthly limit reached (${usage.used} of ${usage.limit}) — try again next month.` };
    }
  }

  const trimmed = messages.slice(-12).map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 4000) }));
  const result = await answerStudioQuestion(orgId, org.name, trimmed);

  if (!org.is_internal && "reply" in result) await recordUsageEvent(orgId, "studio_assistant_question");

  return result;
}
