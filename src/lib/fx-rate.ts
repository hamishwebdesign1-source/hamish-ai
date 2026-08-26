import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";

// Command Centre improvement #5 — real GBP conversion for Model
// Performance's cost figure. studio-model-performance.ts's own original
// comment explained why cost stayed USD-only: "an FX rate is one more
// number that goes stale by the day... mixing an invented exchange rate
// into it would be exactly the fabrication the rest of this app
// refuses to do." The fix isn't to invent a rate, it's to fetch a real
// one and be honest about when it was fetched — fx_rates (schema-fx-
// rates.sql) stores exactly that, refreshed daily by fetchAndStoreFxRate()
// below (api/cron/fx-rate), read back with its own fetched_at date
// rather than presented as live.
//
// Frankfurter (frankfurter.dev) — European Central Bank reference
// rates, free, no API key required. Not Anthropic's own rate (they
// don't publish one for converting invoiced USD to other currencies);
// ECB's daily USD/GBP reference rate is a real, independently checkable
// number, which is the actual bar here, not "the exact rate a bank
// would give a real transaction."

export type FxRate = { rate: number; fetchedAt: string };

const FX_PAIR = "USD_GBP";

export async function fetchAndStoreFxRate() {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Supabase is not configured." as const };

  let rate: number;
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP");
    if (!res.ok) return { error: `Frankfurter API returned ${res.status}.` };
    const body = (await res.json()) as { rates?: { GBP?: number } };
    if (typeof body.rates?.GBP !== "number") return { error: "Frankfurter API response was missing a GBP rate." };
    rate = body.rates.GBP;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch the FX rate." };
  }

  const { error } = await admin.from("fx_rates").upsert({ pair: FX_PAIR, rate, fetched_at: new Date().toISOString() });
  if (error) return { error: "Failed to save the FX rate." };

  return { rate };
}

// Read side — the dashboard's own Model Performance card. Returns null
// (not a stale-but-invisible fallback) when the cron hasn't run yet,
// same "real data or nothing" rule as everywhere else; the caller falls
// back to showing the USD figure alone in that case.
export async function getUsdGbpRate(admin: SupabaseClient): Promise<FxRate | null> {
  const { data } = await admin.from("fx_rates").select("rate, fetched_at").eq("pair", FX_PAIR).maybeSingle();
  if (!data) return null;
  return { rate: data.rate, fetchedAt: data.fetched_at };
}
