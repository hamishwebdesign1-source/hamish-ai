import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { runSiteCheck } from "@/lib/site-monitor";
import { sendSiteAlertEmail, type FlaggedClient } from "@/lib/send-site-alert";

const SSL_WARNING_DAYS = 14;

// Triggered daily by the Vercel Cron job in vercel.json. Same shared-secret
// pattern Vercel's own docs recommend for cron routes — no user session
// exists at 8am, so a bearer token is the auth boundary instead. The exact
// same code path can be exercised locally with a plain curl carrying the
// right header, which is how this was verified before deploying.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, business_name, website_url")
    .not("website_url", "is", null);

  if (error) {
    console.error("Cron: failed to fetch clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients." }, { status: 500 });
  }

  const checked: string[] = [];
  const flagged: FlaggedClient[] = [];

  for (const client of clients ?? []) {
    if (!client.website_url) continue;

    const result = await runSiteCheck(client.id);
    checked.push(client.business_name);

    if ("error" in result) {
      console.error(`Cron: site check failed for ${client.business_name}:`, result.error);
      continue;
    }

    const check = result.check;
    const reasons: string[] = [];

    if (check.uptime_ok === false) reasons.push("site unreachable");
    if (check.ssl_ok === false) reasons.push("SSL invalid");
    if (check.ssl_valid_until) {
      const daysLeft = (new Date(check.ssl_valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysLeft <= SSL_WARNING_DAYS) {
        reasons.push(`SSL expires in ${Math.max(0, Math.round(daysLeft))} days`);
      }
    }
    if (check.broken_links?.length > 0) {
      reasons.push(`${check.broken_links.length} broken link(s)`);
    }

    if (reasons.length > 0) {
      flagged.push({
        businessName: client.business_name,
        websiteUrl: client.website_url,
        reasons,
        aiSummary: check.ai_summary ?? null,
      });
    }
  }

  if (flagged.length > 0) {
    await sendSiteAlertEmail(flagged);
  }

  return NextResponse.json({ checked, flagged: flagged.map((f) => f.businessName) });
}
