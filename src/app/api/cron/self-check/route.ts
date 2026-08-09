import { NextResponse } from "next/server";
import { checkOwnSite } from "@/lib/self-monitor";
import { sendErrorAlert } from "@/lib/send-error-alert";
import { recordCronRun } from "@/lib/record-cron-run";

const SSL_WARNING_DAYS = 14;

// Triggered daily by the Vercel Cron job in vercel.json — same shared-secret
// pattern as the other cron routes. Deliberately silent on success (no
// email) so this doesn't add inbox noise; only fires sendErrorAlert when
// something is actually wrong, same convention as every other alert path
// in the codebase.
//
// Note on frequency: Vercel's Hobby plan allows cron jobs at most once a
// day, so this can't catch an outage faster than ~24h. That's still a real
// improvement over the status quo (nothing was checking hamishai.org's own
// uptime at all), but for genuinely fast detection a dedicated third-party
// uptime monitor (e.g. UptimeRobot's free tier, checks every 5 minutes,
// fully independent of this deployment) is the correct complement — this
// route doesn't replace that, it's a same-pattern-as-clients baseline.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let result;
  try {
    result = await checkOwnSite();
  } catch (err) {
    console.error("Self-check cron crashed:", err);
    await sendErrorAlert("Daily self-check cron", `The run crashed:\n\n${err}`);
    await recordCronRun("self-check", "error", { error: String(err) });
    return NextResponse.json({ error: "Self-check crashed." }, { status: 500 });
  }

  const reasons: string[] = [];
  if (!result.uptimeOk) reasons.push(`site unreachable (status: ${result.status ?? "no response"})`);
  if (result.sslOk === false) reasons.push("SSL invalid");
  if (result.sslValidUntil) {
    const daysLeft = (new Date(result.sslValidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= SSL_WARNING_DAYS) reasons.push(`SSL expires in ${Math.max(0, Math.round(daysLeft))} days`);
  }

  if (reasons.length > 0) {
    await sendErrorAlert(
      "hamishai.org self-check",
      `The daily uptime check for hamishai.org found a problem:\n\n${reasons.join("\n")}\n\nResponse time: ${result.responseMs ?? "n/a"}ms`
    );
  }

  // The run itself always "succeeded" here (it executed to completion) —
  // `reasons` is what tells the Automation page whether it needs attention,
  // kept separate from whether the cron job itself is broken.
  await recordCronRun("self-check", "success", { summary: { ok: reasons.length === 0, reasons, ...result } });

  return NextResponse.json({ ok: reasons.length === 0, reasons, ...result });
}
