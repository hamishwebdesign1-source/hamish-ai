import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { renderProposalPdf } from "@/lib/proposal-pdf";
import type { SalesKit } from "@/lib/draft-sales-kit";
import type { RateCardItem } from "@/lib/rate-card";

// Roadmap item #6 — session-gated, not the public digest-action-tokens.ts
// pattern: this is the owner downloading their own proposal, not
// something an emailed link needs to work for a signed-out recipient.
// Session-scoped client throughout — prospects_select_own_org RLS
// (schema-rls-prospects.sql) and organisations_select_own
// (schema-organisations.sql) enforce the org boundary independently of
// this route's own membership check getting it right.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return NextResponse.json({ error: "No organisation found for this session." }, { status: 403 });

  const { data: prospect } = await supabase
    .from("prospects")
    .select("business_name, sales_kit")
    .eq("id", id)
    .eq("org_id", membership.orgId)
    .maybeSingle();
  if (!prospect) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });

  const salesKit = prospect.sales_kit as SalesKit | null;
  if (!salesKit?.proposal_outline) {
    return NextResponse.json({ error: "Generate this prospect's sales kit first — there's no proposal content yet." }, { status: 400 });
  }

  const { data: org } = await supabase.from("organisations").select("name, brand, is_internal").eq("id", membership.orgId).single();
  const brand = (org?.brand ?? {}) as { accentColor?: string; rateCard?: RateCardItem[]; replyToEmail?: string };
  const orgName = org && !org.is_internal ? org.name : "Hamish AI";

  const pdf = await renderProposalPdf({
    orgName,
    accentColor: brand.accentColor ?? null,
    prospectBusinessName: prospect.business_name,
    proposalOutline: salesKit.proposal_outline,
    rateCard: brand.rateCard ?? [],
    contactEmail: brand.replyToEmail ?? null,
  });

  const filename = `${prospect.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-proposal.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
