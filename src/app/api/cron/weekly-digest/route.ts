import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/weekly-digest";

// Triggered weekly by the Vercel Cron job in vercel.json. Same shared-secret
// bearer-token pattern as the daily site-checks cron route — no user
// session exists on a scheduled trigger, so the token is the auth boundary.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWeeklyDigests();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ sent: result.sent });
}
