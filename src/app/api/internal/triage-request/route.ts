import { NextResponse } from "next/server";
import { triageRequest } from "@/lib/triage-request";

// Thin HTTP wrapper around triageRequest() — kept as its own route so a
// future client-facing submission form can call it directly, without
// duplicating the triage logic. The internal admin UI calls triageRequest()
// as a Server Action instead, avoiding a self-fetch for the same result.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const clientId = body?.client_id;
  const rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : "";

  if (!clientId || !rawText) {
    return NextResponse.json({ error: "client_id and raw_text are required." }, { status: 400 });
  }

  const result = await triageRequest(clientId, rawText);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ request: result.request });
}
