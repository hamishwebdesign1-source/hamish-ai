import { NextRequest, NextResponse } from "next/server";
import { getAffiliateLinkBySlug, recordAffiliateClick } from "@/lib/affiliate-links";

// Video Affiliate Engine, Phase 0 — every affiliate link placed in a video
// description points here rather than straight at Amazon, since Amazon
// gives no click/conversion API at all (see affiliate-links.ts's header
// comment). A 404 page here — not a hard error — is the correct behaviour
// for an unknown/deactivated slug, since this route is reachable by
// anyone who's watched the video, not just internal traffic.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await getAffiliateLinkBySlug(slug);

  if (!link || !link.active) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  // Fire-and-forget — a logging failure must never delay or block the
  // actual redirect to Amazon.
  void recordAffiliateClick(link.id, request.headers.get("referer"), request.headers.get("user-agent"));

  return NextResponse.redirect(link.target_url, { status: 302 });
}
