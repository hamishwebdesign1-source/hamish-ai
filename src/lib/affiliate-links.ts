import { getSupabaseAdmin } from "@/lib/supabase";

// Video Affiliate Engine, Phase 0 (see the "Operating Blueprint" artifact
// and pinterest-amazon-affiliate-project memory) — the click-tracking
// layer the blueprint calls for regardless of platform: Amazon gives no
// click/conversion API at all, only a weekly CSV export from the
// Associates dashboard, so a real click has to be captured somewhere we
// control before it reaches Amazon at all. Every affiliate link placed in
// a video description points at /go/{slug} (see src/app/go/[slug]/route.ts)
// rather than straight at Amazon.

function randomSlug(): string {
  // Short, URL-safe, no separators to avoid ambiguity — matches the
  // "short code" framing in the schema's own comment, not a UUID (too
  // long to be usable in a video description or on-screen).
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
}

export type AffiliateLink = {
  id: string;
  slug: string;
  product_name: string;
  target_url: string;
  active: boolean;
};

// Creates a new tracked link. Retries once on a slug collision (astronomically
// unlikely at this volume, but free to guard against) rather than trusting
// randomSlug() is collision-free by construction.
export async function createAffiliateLink(params: {
  productName: string;
  targetUrl: string;
  ideaId?: string;
  videoId?: string;
  notes?: string;
}): Promise<AffiliateLink | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase is not configured." };

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = randomSlug();
    const { data, error } = await supabase
      .from("affiliate_links")
      .insert({
        slug,
        product_name: params.productName,
        target_url: params.targetUrl,
        idea_id: params.ideaId ?? null,
        video_id: params.videoId ?? null,
        notes: params.notes ?? null,
      })
      .select("id, slug, product_name, target_url, active")
      .single();

    if (!error && data) return data;
    // 23505 = unique_violation — only case worth retrying; anything else
    // (misconfigured table, bad FK) will fail identically on retry.
    if (error?.code !== "23505") {
      console.error("Failed to create affiliate link:", error);
      return { error: "Failed to create affiliate link." };
    }
  }
  return { error: "Failed to generate a unique slug after two attempts." };
}

// Fire-and-forget from the redirect route — a click that fails to log
// should never delay or block the actual redirect to Amazon.
export async function recordAffiliateClick(linkId: string, referrer: string | null, userAgent: string | null): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from("affiliate_clicks").insert({ link_id: linkId, referrer, user_agent: userAgent });
  if (error) console.error(`Failed to record affiliate click for link ${linkId}:`, error);
}

export async function getAffiliateLinkBySlug(slug: string): Promise<AffiliateLink | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("affiliate_links").select("id, slug, product_name, target_url, active").eq("slug", slug).maybeSingle();
  return data ?? null;
}

export type AffiliateLinkStats = AffiliateLink & { click_count: number; created_at: string };

// For the future performance-analyst dashboard (Phase 1/2 of the
// blueprint) — not wired into any UI yet, but the click data is worthless
// without a way to read it back out, so this exists from day one rather
// than being bolted on later.
export async function listAffiliateLinksWithClickCounts(): Promise<AffiliateLinkStats[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data: links } = await supabase
    .from("affiliate_links")
    .select("id, slug, product_name, target_url, active, created_at")
    .order("created_at", { ascending: false });
  if (!links?.length) return [];

  const { data: clicks } = await supabase.from("affiliate_clicks").select("link_id");
  const counts = new Map<string, number>();
  for (const c of clicks ?? []) counts.set(c.link_id, (counts.get(c.link_id) ?? 0) + 1);

  return links.map((l) => ({ ...l, click_count: counts.get(l.id) ?? 0 }));
}
