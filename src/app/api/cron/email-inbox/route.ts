import { NextResponse } from "next/server";
import { checkEmailInbox } from "@/lib/email-inbox";
import { checkPendingLeadSends } from "@/lib/check-lead-sends";
import { sendErrorAlert } from "@/lib/send-error-alert";

// Triggered on a schedule by the Vercel Cron job in vercel.json. Same
// shared-secret bearer-token pattern as the other cron routes.
//
// Does two Gmail-authenticated jobs back to back since they share the same
// auth setup: triaging real client replies (checkEmailInbox), and sweeping
// lead-outreach drafts to see which were actually sent since the last run
// (checkPendingLeadSends) — see check-lead-sends.ts for why that can't be
// known at the moment the draft is created.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkEmailInbox();
  if ("error" in result) {
    await sendErrorAlert("Daily email-inbox cron", result.error ?? "Unknown error.");
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const sendsResult = await checkPendingLeadSends();
  if ("error" in sendsResult) {
    await sendErrorAlert("Daily lead-send check", sendsResult.error ?? "Unknown error.");
    return NextResponse.json({ error: sendsResult.error }, { status: 500 });
  }

  return NextResponse.json({
    processed: result.processed,
    leadsConfirmedSent: sendsResult.confirmed,
    leadsDraftCleared: sendsResult.cleared,
  });
}
