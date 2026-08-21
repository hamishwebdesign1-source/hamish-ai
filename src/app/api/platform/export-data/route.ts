import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUserWithRetry } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { getSupabaseAdmin } from "@/lib/supabase";

// GDPR minimum-viable compliance, part 1 — a tenant's own self-service
// export of everything held about their organisation. Session-gated like
// every other /api/platform/* route, re-derives the caller's own org
// rather than trusting anything in the URL.
//
// Deliberately excludes email_connections.refresh_token (a live Microsoft
// credential, not personal data an export needs to contain) and Stripe
// secret identifiers beyond what's already visible in Studio's own UI —
// an export is "what do you hold about us," not a way to exfiltrate
// working credentials.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getUserWithRetry(supabase);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) return NextResponse.json({ error: "No organisation found for this session." }, { status: 404 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const orgId = membership.orgId;

  const [
    { data: organisation },
    { data: memberships },
    { data: prospects },
    { data: clients },
    { data: emailConnection },
    { data: knowledgeBase },
  ] = await Promise.all([
    admin
      .from("organisations")
      .select("id, name, slug, plan, created_at, prospecting_config, brand")
      .eq("id", orgId)
      .single(),
    admin.from("memberships").select("email, role, invited_at, accepted_at").eq("org_id", orgId),
    admin
      .from("prospects")
      .select("id, business_name, category, neighbourhood, website, email, phone, status, created_at, contacted_at, replied_at")
      .eq("org_id", orgId),
    admin
      .from("clients")
      .select("id, business_name, email, website_url, maintenance_plan, created_at")
      .eq("org_id", orgId),
    admin.from("email_connections").select("provider, email_address, connected_at, last_checked_at").eq("org_id", orgId).maybeSingle(),
    admin.from("knowledge_base").select("id, title, content, created_at").eq("org_id", orgId),
  ]);

  const [{ data: projects }, { data: monthlyReports }] = await Promise.all([
    admin.from("projects").select("id, client_id, name, target_date, status, created_at").eq("org_id", orgId),
    admin.from("monthly_reports").select("id, client_id, period_start, period_end, snapshot, created_at").eq("org_id", orgId),
  ]);

  const clientIds = (clients ?? []).map((c) => c.id);
  const [{ data: clientMembers }, { data: requests }, { data: invoices }] = await Promise.all([
    clientIds.length
      ? admin.from("client_members").select("client_id, email, role, invited_at").in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? admin
          .from("requests")
          .select("id, client_id, raw_text, status, category, priority, created_at, responded_at")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? admin.from("invoices").select("id, client_id, amount_pence, description, status, due_date, paid_at, created_at").in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
  ]);

  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: tasks } = requestIds.length
    ? await admin.from("tasks").select("id, request_id, title, description, status, created_at").in("request_id", requestIds)
    : { data: [] };

  const exportPayload = {
    exported_at: new Date().toISOString(),
    organisation,
    memberships: memberships ?? [],
    prospects: prospects ?? [],
    clients: clients ?? [],
    client_members: clientMembers ?? [],
    requests: requests ?? [],
    tasks: tasks ?? [],
    projects: projects ?? [],
    monthly_reports: monthlyReports ?? [],
    invoices: invoices ?? [],
    email_connection: emailConnection ?? null,
    knowledge_base: knowledgeBase ?? [],
  };

  const filename = `${(organisation?.slug ?? "organisation").replace(/[^a-z0-9-]/gi, "-")}-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
