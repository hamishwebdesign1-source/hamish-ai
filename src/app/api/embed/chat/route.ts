import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { answerEmbedChat } from "@/lib/answer-embed-chat";
import { isRateLimited, getClientKey } from "@/lib/chat-rate-limit";

// The first genuinely public, cross-origin, unauthenticated API route in
// this app — every other route is same-origin (a Studio/portal session,
// or the demo chatbots called from pages hosted on hamishai.org itself).
// This one is called by a <script> embedded on a tenant's *client's own*
// website, on whatever domain that happens to be, with no login at all.
// That changes the security model completely: the origin check below is
// the real gate (not the clientId, which isn't secret — see
// schema-chatbot-embed.sql's own comment), and rate limiting is
// per-client rather than per-org, since a public bot's traffic is driven
// by that one client's own site visitors, independent of anything else
// the tenant does in Studio.
const MAX_MESSAGES = 8;

async function resolveClient(clientId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("clients")
    .select("id, chatbot_embed_enabled, chatbot_embed_allowed_origin")
    .eq("id", clientId)
    .maybeSingle();
  return data;
}

// Origins compared as-is (scheme + host, no trailing slash) — normalising
// further (e.g. treating www. and bare domain as equivalent) is left to
// the tenant setting the exact origin their client's site actually sends,
// same "explicit beats magic" reasoning as this app's other config
// fields.
function originAllowed(requestOrigin: string | null, allowedOrigin: string | null): boolean {
  if (!requestOrigin || !allowedOrigin) return false;
  return requestOrigin.replace(/\/$/, "") === allowedOrigin.replace(/\/$/, "");
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client");
  const origin = request.headers.get("origin");

  const client = clientId ? await resolveClient(clientId) : null;
  const allowed = client?.chatbot_embed_enabled && originAllowed(origin, client.chatbot_embed_allowed_origin);

  return new NextResponse(null, { status: 204, headers: allowed ? corsHeaders(origin) : {} });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client");
  const origin = request.headers.get("origin");

  if (!clientId) return NextResponse.json({ error: "Missing client id." }, { status: 400 });

  const client = await resolveClient(clientId);
  if (!client || !client.chatbot_embed_enabled) {
    return NextResponse.json({ error: "Chat is not available." }, { status: 404 });
  }
  if (!originAllowed(origin, client.chatbot_embed_allowed_origin)) {
    // Deliberately vague — this is a public endpoint, no reason to help
    // an attacker distinguish "wrong origin" from "client doesn't exist."
    return NextResponse.json({ error: "Chat is not available." }, { status: 403 });
  }

  const headers = corsHeaders(origin);
  const ip = getClientKey(request);

  // Two layers: a tight per-IP-per-client burst limit (catches a single
  // abusive visitor or script) and a much looser per-client rolling
  // ceiling (catches aggregate cost regardless of how distributed across
  // IPs) — reusing check_rate_limit's existing window/max-requests shape
  // rather than a new usage-tracking table, since a rolling window is a
  // better fit for a public surface with no real "billing month" concept
  // to the visitor.
  if (await isRateLimited(`embed-burst:${clientId}:${ip}`, { windowSeconds: 5 * 60, maxRequests: 10 })) {
    return NextResponse.json({ error: "Too many messages — please wait a moment." }, { status: 429, headers });
  }
  if (await isRateLimited(`embed-monthly:${clientId}`, { windowSeconds: 30 * 24 * 60 * 60, maxRequests: 200 })) {
    return NextResponse.json({ error: "This chat has reached its monthly limit." }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length) {
    return NextResponse.json({ error: "No message provided." }, { status: 400, headers });
  }

  const trimmed = messages.slice(-MAX_MESSAGES).map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: String(m.content || "").slice(0, 1000),
  }));

  const result = await answerEmbedChat(clientId, trimmed);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502, headers });

  return NextResponse.json({ reply: result.reply }, { headers });
}
