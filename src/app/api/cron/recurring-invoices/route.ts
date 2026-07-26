import { NextResponse } from "next/server";
import { generateMonthlyInvoices } from "@/lib/recurring-invoices";
import { sendErrorAlert } from "@/lib/send-error-alert";

// Triggered monthly (1st of the month) by the Vercel Cron job in
// vercel.json. Same shared-secret bearer-token pattern as the other cron
// routes.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateMonthlyInvoices();
  if ("error" in result) {
    await sendErrorAlert("Recurring invoices cron", result.error ?? "Unknown error.");
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (result.failed.length > 0) {
    await sendErrorAlert(
      "Recurring invoices cron",
      `${result.failed.length} recurring invoice(s) failed to create:\n\n${result.failed.join("\n")}`
    );
  }

  return NextResponse.json(result);
}
