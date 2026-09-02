import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { captureEmbedLead } from "@/lib/capture-embed-lead";
import { isRateLimited, getClientKey } from "@/lib/chat-rate-limit";

// Studio big-ticket #6 ("embedded chatbot has no lead-capture path") —
// same public, cross-origin, unauthenticated shape as
// /api/embed/chat/route.ts (this file mirrors its origin-check/CORS/
// rate-limit logic deliberately, not just coincidentally — see that
// route's own comment for the full reasoning on why the origin check is
// the real security gate here, not the clientId).

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
    return NextResponse.json({ error: "Chat is not available." }, { status: 403 });
  }

  const headers = corsHeaders(origin);
  const ip = getClientKey(request);

  // Tighter than the chat route's own burst limit — a lead submission
  // is a rare, deliberate action a real visitor does once, not a normal
  // back-and-forth conversation turn.
  if (await isRateLimited(`embed-lead-burst:${clientId}:${ip}`, { windowSeconds: 10 * 60, maxRequests: 3 })) {
    return NextResponse.json({ error: "Too many attempts — please wait a moment." }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const message = typeof body?.message === "string" ? body.message : null;
  if (!email) return NextResponse.json({ error: "Enter your email address." }, { status: 400, headers });

  const result = await captureEmbedLead(clientId, email, message);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400, headers });

  return NextResponse.json({ ok: true }, { headers });
}
