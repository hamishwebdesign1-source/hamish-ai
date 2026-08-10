import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { AiCopilot } from "@/components/portal/ai-copilot";

// Client portal redesign Phase 3 — the promoted "Ask HamishAI" surface.
// Same real, account-aware copilot that used to live only inside an
// Insights tab (answerAccountQuestion via /api/portal/copilot) — now the
// portal's one clear AI entry point, reachable from the sidebar and
// linked from Home, Help, and Insights instead of being duplicated as a
// second, weaker Q&A box in those places.
export default async function PortalAskPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");

  const { data: client } = await supabase
    .from("clients")
    .select("business_name")
    .eq("id", membership.clientId)
    .single();
  if (!client) redirect("/portal/login");

  return (
    <div>
      <h1 className="text-page-title">Ask HamishAI</h1>
      <p className="text-page-subtitle mt-1">
        A quick way to check on your account — requests, spend, site health. Answered from your real data, not a
        generic FAQ.
      </p>

      <div className="mt-6 max-w-2xl">
        <AiCopilot businessName={client.business_name} />
      </div>
    </div>
  );
}
