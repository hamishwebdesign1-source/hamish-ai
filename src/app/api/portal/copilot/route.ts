import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { answerAccountQuestion } from "@/lib/answer-account-question";

const MAX_MESSAGES = 12;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const { data: client } = await admin.from("clients").select("id, status").eq("email", user.email).single();
  if (!client || client.status === "churned") {
    return NextResponse.json({ error: "No portal access found." }, { status: 403 });
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

  const result = await answerAccountQuestion(client.id, trimmed);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ reply: result.reply });
}
