import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Backs the command palette's search-as-you-type (Stage 7). Protected the
// same way every other /api/internal/* route is — src/middleware.ts gates
// the whole path prefix on the admin cookie, no per-route check needed.
// Deliberately thin: two `ilike` queries, no AI involved, capped results —
// this is a lookup, not a feature that needs a Claude call.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ leads: [], clients: [] });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ leads: [], clients: [] });

  const [{ data: leads }, { data: clients }] = await Promise.all([
    supabase.from("prospects").select("id, business_name, status").ilike("business_name", `%${q}%`).limit(5),
    supabase.from("clients").select("id, business_name").ilike("business_name", `%${q}%`).limit(5),
  ]);

  return NextResponse.json({ leads: leads ?? [], clients: clients ?? [] });
}
