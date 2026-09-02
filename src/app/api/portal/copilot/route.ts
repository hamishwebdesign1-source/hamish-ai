import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getSupabaseAdmin } from "@/lib/supabase";
import { answerAccountQuestion } from "@/lib/answer-account-question";
import { isRateLimited } from "@/lib/chat-rate-limit";
import { getUsageStatus, recordUsageEvent } from "@/lib/usage-limits";
import type { PlatformPlanSlug } from "@/lib/platform-plans";

const MAX_MESSAGES = 12;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Session-bound client from here on, same as the insights page — RLS
  // (schema-client-members.sql) enforces this can only ever resolve to a
  // client this signed-in user is a member of, independent of this
  // app-level check.
  const membership = await getPortalMembership(supabase, user.email);
  const { data: client } = membership
    ? await supabase.from("clients").select("id, status, org_id").eq("id", membership.clientId).single()
    : { data: null };
  if (!client || client.status === "churned") {
    return NextResponse.json({ error: "No portal access found." }, { status: 403 });
  }

  // This was previously the one AI-calling endpoint in the app with no rate
  // limit at all — being signed in isn't a defence against a compromised
  // account or a runaway client-side loop burning Anthropic API spend.
  if (await isRateLimited(`portal-copilot:${client.id}`)) {
    return NextResponse.json({ error: "Too many questions in a short time — try again in a few minutes." }, { status: 429 });
  }

  // Studio big-ticket ("portal copilot has no monthly usage cap") — the
  // burst limiter above is protection on top of a monthly cap
  // (chat-rate-limit.ts's own doc comment), not a replacement for one;
  // this is the one real Anthropic-calling surface reachable by an
  // outside party (a tenant's own client) that had no cap underneath
  // it at all. Same gate shape as askClientsCopilot()'s own (its
  // staff-facing counterpart, clients/actions.ts) — the admin client,
  // not the session-scoped one, for this lookup: a portal client's own
  // session can read its org's row via RLS (schema-rls-organisations-
  // via-client.sql), but that policy's own comment is explicit this is
  // "not its billing plan or anything else" a client should be reading.
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  const { data: org } = client.org_id ? await admin.from("organisations").select("plan, is_internal").eq("id", client.org_id).single() : { data: null };

  if (org && !org.is_internal) {
    const usage = await getUsageStatus(client.org_id!, "portal_copilot_question", org.plan as PlatformPlanSlug);
    if (!usage.allowed) {
      return NextResponse.json({ error: "This business has reached its monthly question limit — please try again next month, or contact them directly." }, { status: 429 });
    }
  }

  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const trimmed = messages.slice(-MAX_MESSAGES).map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: String(m.content || "").slice(0, 4000),
  }));

  const result = await answerAccountQuestion(supabase, client.id, trimmed);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502 });

  if (org && !org.is_internal) await recordUsageEvent(client.org_id!, "portal_copilot_question");

  return NextResponse.json({ reply: result.reply });
}
