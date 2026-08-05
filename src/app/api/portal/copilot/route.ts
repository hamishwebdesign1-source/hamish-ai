import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { answerAccountQuestion } from "@/lib/answer-account-question";
import { isRateLimited } from "@/lib/chat-rate-limit";

const MAX_MESSAGES = 12;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Session-bound client from here on, same as the insights page — RLS
  // (schema-rls-portal.sql) enforces this can only ever resolve to the
  // signed-in user's own client row, independent of this app-level check.
  const { data: client } = await supabase.from("clients").select("id, status").eq("email", user.email).single();
  if (!client || client.status === "churned") {
    return NextResponse.json({ error: "No portal access found." }, { status: 403 });
  }

  // This was previously the one AI-calling endpoint in the app with no rate
  // limit at all — being signed in isn't a defence against a compromised
  // account or a runaway client-side loop burning Anthropic API spend.
  if (await isRateLimited(`portal-copilot:${client.id}`)) {
    return NextResponse.json({ error: "Too many questions in a short time — try again in a few minutes." }, { status: 429 });
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

  return NextResponse.json({ reply: result.reply });
}
