import { NextResponse } from "next/server";
import { checkEmailInbox } from "@/lib/email-inbox";
import { sendErrorAlert } from "@/lib/send-error-alert";

// Triggered on a schedule by the Vercel Cron job in vercel.json. Same
// shared-secret bearer-token pattern as the other cron routes.
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

  return NextResponse.json({ processed: result.processed });
}
