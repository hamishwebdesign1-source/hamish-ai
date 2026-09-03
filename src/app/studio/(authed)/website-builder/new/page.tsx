import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { WebsiteProjectWizard } from "@/components/platform/website-project-wizard";
import { Eyebrow } from "@/components/eyebrow";
import { buildWizardPrefill, type WizardPrefill } from "@/lib/website-brief";

// SEO/metadata audit (2 Sep 2026) — see studio/(authed)/page.tsx for the
// full reasoning (every real page under here gets its own real title).
export const metadata: Metadata = { title: "New website project | Studio" };

export default async function NewWebsiteProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; prefill?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, business_name")
    .eq("org_id", membership.orgId)
    .order("business_name", { ascending: true });

  if (!clients || clients.length === 0) {
    redirect("/studio/clients");
  }

  // Prospects → Website Builder prefill (BACKLOG.md, 2026-09-03) —
  // `client` alone just preselects the dropdown (always safe, no data
  // exposure); `prefill=1` is the actual explicit opt-in, only ever
  // present because the user clicked "Start website build from this
  // prospect" on the Clients page. Never trusts a client-supplied
  // prospect id from the URL — the source prospect is re-derived
  // server-side from the given client's own source_lead_id, scoped to
  // this caller's org_id on both lookups.
  const { client: clientIdParam, prefill: prefillParam } = await searchParams;
  let prefill: WizardPrefill | undefined;
  let preselectedClientId: string | undefined;

  if (clientIdParam && clients.some((c) => c.id === clientIdParam)) {
    preselectedClientId = clientIdParam;

    if (prefillParam === "1") {
      const { data: client } = await supabase
        .from("clients")
        .select("source_lead_id")
        .eq("id", clientIdParam)
        .eq("org_id", membership.orgId)
        .maybeSingle();

      if (client?.source_lead_id) {
        const { data: prospect } = await supabase
          .from("prospects")
          .select("business_name, category, neighbourhood, website, website_mockup, research")
          .eq("id", client.source_lead_id)
          .eq("org_id", membership.orgId)
          .maybeSingle();

        if (prospect) prefill = buildWizardPrefill(prospect);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow>Website Builder</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">Create Website Project</h1>
      <p className="mt-2 text-muted-foreground">
        Answer what you know — HamishAI turns this into a professional Website Build Brief you can hand straight to
        an AI coding agent.
      </p>
      <div className="mt-8">
        <WebsiteProjectWizard clients={clients} initialClientId={preselectedClientId} prefill={prefill} />
      </div>
    </div>
  );
}
