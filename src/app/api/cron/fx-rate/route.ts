import { NextResponse } from "next/server";
import { fetchAndStoreFxRate } from "@/lib/fx-rate";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

// Triggered daily by the Vercel Cron job in vercel.json — same shared-
// secret bearer-token pattern as every other cron route. Daily, not
// weekly: unlike Business Health (a slow-moving score), an FX rate
// genuinely does move day to day, and this is a single cheap external
// call, not a per-org fan-out.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await fetchAndStoreFxRate();
  if ("error" in result) {
    await sendErrorAlert("FX rate cron", result.error ?? "Unknown error.");
    await recordCronRun("fx-rate", "error", { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await recordCronRun("fx-rate", "success", { summary: { rate: result.rate } });

  return NextResponse.json({ rate: result.rate });
}
