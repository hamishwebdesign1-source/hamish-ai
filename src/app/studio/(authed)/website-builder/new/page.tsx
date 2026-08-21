import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { WebsiteProjectWizard } from "@/components/platform/website-project-wizard";
import { Eyebrow } from "@/components/eyebrow";

export default async function NewWebsiteProjectPage() {
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

  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow>Website Builder</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">Create Website Project</h1>
      <p className="mt-2 text-muted-foreground">
        Answer what you know — HamishAI turns this into a professional Website Build Brief you can hand straight to
        an AI coding agent.
      </p>
      <div className="mt-8">
        <WebsiteProjectWizard clients={clients} />
      </div>
    </div>
  );
}
