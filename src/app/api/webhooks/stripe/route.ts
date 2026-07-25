import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

// Stripe's own callback when an invoice's status changes — verified via
// its signature header rather than the admin cookie (Stripe has no way
// to hold that), so this route deliberately sits outside the
// /api/internal/* matcher the auth middleware protects.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!webhookSecret || !stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const invoice = event.data.object as Stripe.Invoice;

  const statusByEvent: Record<string, string> = {
    "invoice.paid": "paid",
    "invoice.voided": "void",
    "invoice.marked_uncollectible": "uncollectible",
    "invoice.payment_failed": "open",
  };

  const newStatus = statusByEvent[event.type];
  if (newStatus) {
    const update: { status: string; paid_at?: string } = { status: newStatus };
    if (newStatus === "paid") update.paid_at = new Date().toISOString();

    const { error } = await supabase.from("invoices").update(update).eq("stripe_invoice_id", invoice.id);
    if (error) console.error(`Failed to update invoice ${invoice.id} to ${newStatus}:`, error);
  }

  return NextResponse.json({ received: true });
}
