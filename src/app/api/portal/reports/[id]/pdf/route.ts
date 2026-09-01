import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getPortalOrgBranding } from "@/lib/portal-org-branding";
import { monthLabelFromDateStr } from "@/lib/portal-events";
import { renderMonthlyReportPdf } from "@/lib/monthly-report-pdf";
import type { MonthlyReportSnapshot } from "@/lib/monthly-report";

// Studio big-ticket ("branded, delivered monthly client reports") — a
// report already gets this same PDF emailed once, at generation time
// (monthly-report.ts); this is the on-demand re-download for a client
// who wants it again later, same session-gated shape as Studio's own
// /api/studio/prospects/[id]/proposal-pdf. Session-scoped client
// throughout — monthly_reports_select_own RLS (schema-rls-monthly-
// reports.sql) enforces the client boundary independently of this
// route's own membership check getting it right.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) return NextResponse.json({ error: "No portal access found." }, { status: 403 });

  const { data: report } = await supabase
    .from("monthly_reports")
    .select("period_start, snapshot")
    .eq("id", id)
    .eq("client_id", membership.clientId)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const { data: client } = await supabase.from("clients").select("business_name, org_id").eq("id", membership.clientId).single();
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const orgBranding = await getPortalOrgBranding(supabase, client.org_id);
  const periodLabel = monthLabelFromDateStr(report.period_start);

  const pdf = await renderMonthlyReportPdf({
    orgName: orgBranding.name,
    accentColor: orgBranding.accentColor,
    clientBusinessName: client.business_name,
    periodLabel,
    snapshot: report.snapshot as MonthlyReportSnapshot,
  });

  const filename = `${periodLabel.replace(/\s+/g, "-").toLowerCase()}-report.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
