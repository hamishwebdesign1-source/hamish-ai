import { redirect } from "next/navigation";
import { CircleAlert, CheckCircle2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { hasPlatformMsConfig } from "@/lib/tenant-graph-auth";
import { SettingsPanel } from "@/components/platform/settings-panel";
import { BrandingPanel } from "@/components/platform/branding-panel";

// Server-side data assembly only, same split as /studio/prospects — the
// connect/disconnect/check actions live in settings/actions.ts and
// api/platform/ms-connect + ms-callback, called from SettingsPanel below.
export default async function StudioSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ms_connected?: string; ms_error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  // Session-scoped client — RLS (email_connections_select_own_org,
  // schema-email-connections.sql) enforces the same org boundary
  // independently of this .eq() getting it right.
  const { data: connection } = await supabase
    .from("email_connections")
    .select("email_address, connected_at, last_checked_at")
    .eq("org_id", membership.orgId)
    .eq("provider", "microsoft")
    .maybeSingle();

  // organisations_select_own RLS (schema-organisations.sql) — same policy
  // every other /studio page's org read already relies on.
  const { data: org } = await supabase
    .from("organisations")
    .select("brand, is_internal")
    .eq("id", membership.orgId)
    .single();
  const brand = (org?.brand ?? {}) as { accentColor?: string };

  const params = await searchParams;

  return (
    // Centered column, not left-aligned-and-capped — see prospecting-panel.tsx's
    // comment for why that distinction is the actual fix.
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect your own inbox to automate follow-up tracking.</p>
      </div>

      {params.ms_connected && (
        <p className="flex items-center gap-1.5 text-sm text-accent">
          <CheckCircle2 className="size-4 shrink-0" /> Inbox connected.
        </p>
      )}
      {params.ms_error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" /> {params.ms_error}
        </p>
      )}

      <SettingsPanel connection={connection ?? null} configured={hasPlatformMsConfig()} connectHref="/api/platform/ms-connect" />

      {/* Not rendered for HamishAI's own internal org — getPortalOrgBranding()
          ignores brand.accentColor for is_internal orgs entirely (the
          portal always reads as "HamishAI"), so this control would
          visibly do nothing for that one row. */}
      {!org?.is_internal && <BrandingPanel accentColor={brand.accentColor ?? null} />}
    </div>
  );
}
