import { NextResponse } from "next/server";
import { runSiteCheck } from "@/lib/site-monitor";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const clientId = body?.client_id;
  if (!clientId) return NextResponse.json({ error: "client_id is required." }, { status: 400 });

  const result = await runSiteCheck(clientId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ check: result.check });
}
