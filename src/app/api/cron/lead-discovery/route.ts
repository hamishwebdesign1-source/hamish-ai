import { NextResponse } from "next/server";
import { discoverLeads } from "@/lib/discover-leads";
import { sendErrorAlert } from "@/lib/send-error-alert";

// Triggered weekly by the Vercel Cron job in vercel.json. Same shared-secret
// pattern as every other cron route (see site-checks/route.ts) — no user
// session exists at 7am, so a bearer token is the auth boundary instead.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await discoverLeads();
    if ("error" in result) {
      console.error("Lead discovery cron failed:", result.error);
      await sendErrorAlert("Weekly lead-discovery cron", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (result.searchFailures.length > 0) {
      await sendErrorAlert(
        "Weekly lead-discovery cron",
        `${result.searchFailures.length} of ${result.pairsSearched.length} category/area searches failed:\n\n${result.searchFailures.join("\n")}`
      );
    }

    return NextResponse.json({
      inserted: result.inserted.length,
      insertedNames: result.inserted.map((l) => l.business_name),
      skippedDuplicates: result.skippedDuplicates.length,
      pairsSearched: result.pairsSearched,
    });
  } catch (err) {
    console.error("Lead discovery cron crashed:", err);
    await sendErrorAlert("Weekly lead-discovery cron", `The run crashed partway through:\n\n${err}`);
    return NextResponse.json({ error: "Lead discovery cron crashed." }, { status: 500 });
  }
}
