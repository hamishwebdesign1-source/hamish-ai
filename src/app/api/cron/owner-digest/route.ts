import { NextResponse } from "next/server";
import { sendOwnerDigests } from "@/lib/owner-digest";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered weekly by the Vercel Cron job in vercel.json — same shared-
// secret bearer-token pattern as every other cron route (see weekly-
// digest/route.ts, this org's own client-facing counterpart).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendOwnerDigests();
  if ("error" in result) {
    await sendErrorAlert("Owner digest cron", result.error ?? "Unknown error.");
    await recordCronRun("owner-digest", "error", { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await recordCronRun("owner-digest", "success", { summary: { sent: result.sent } });

  return NextResponse.json({ sent: result.sent });
}
