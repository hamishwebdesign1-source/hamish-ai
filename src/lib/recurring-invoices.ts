import { getSupabaseAdmin } from "@/lib/supabase";
import { createInvoice } from "@/lib/create-invoice";

// A month name is baked into the invoice description and used as the
// idempotency check — if a client already has an invoice with this month's
// marker, we skip them, so a retried or re-triggered cron run can never
// double-bill (no separate "last billed" column to keep in sync).
function monthMarker(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Phase 3: real Stripe subscriptions (subscription.ts) now handle
// recurring billing directly for any client who's been moved onto one —
// Stripe generates and sends their invoice itself each cycle, caught by
// the webhook. This cron stays as the fallback for clients still on the
// old flow (a maintenance rate set, but no subscription started yet), and
// naturally does less every month as more clients migrate, rather than
// needing a hard cutover.
export async function generateMonthlyInvoices() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." as const };

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, business_name, maintenance_monthly_pence")
    .eq("status", "active")
    .is("stripe_subscription_id", null)
    .not("maintenance_monthly_pence", "is", null)
    .gt("maintenance_monthly_pence", 0);

  if (error) return { error: `Failed to fetch clients: ${error.message}` as const };

  const marker = monthMarker(new Date());
  const description = `Monthly maintenance — ${marker}`;

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const client of clients ?? []) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("client_id", client.id)
      .eq("description", description)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped.push(client.business_name);
      continue;
    }

    const result = await createInvoice({
      clientId: client.id,
      amountPence: client.maintenance_monthly_pence!,
      description,
    });

    if ("error" in result) {
      failed.push(`${client.business_name}: ${result.error}`);
    } else {
      created.push(client.business_name);
    }
  }

  return { created, skipped, failed };
}
