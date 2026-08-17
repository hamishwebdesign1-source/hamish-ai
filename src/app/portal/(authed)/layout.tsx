import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getPortalMembership, markMembershipAccepted } from "@/lib/portal-membership";
import { getRecentPortalEvents } from "@/lib/portal-events";
import { PortalSidebar } from "@/components/portal/sidebar";
import { PortalMobileNav } from "@/components/portal/mobile-nav";
import { PortalThemeToggle, PortalThemeInitScript } from "@/components/portal/theme-toggle";
import { NotificationBell } from "@/components/portal/notification-bell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PortalAuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/portal/login");
  }

  // Session-scoped client from here on — RLS (schema-client-members.sql)
  // enforces the same gate at the database level, so a bug in this .eq()
  // alone couldn't leak another client's row in.
  const membership = await getPortalMembership(supabase, user.email);
  const { data: client } = membership
    ? await supabase.from("clients").select("id, business_name, status, org_id").eq("id", membership.clientId).single()
    : { data: null };

  // This is the one portal serving both HamishAI's own clients and every
  // Agency Platform tenant's clients (see the architecture doc's "shared
  // /portal" decision) — org branding is looked up here, once, rather than
  // duplicating this whole layout per tenant. is_internal is the switch:
  // HamishAI's own clients see exactly the same header they always have,
  // byte for byte, since org?.is_internal is false only for a real tenant.
  const { data: org } = client?.org_id
    ? await supabase.from("organisations").select("name, is_internal, brand").eq("id", client.org_id).single()
    : { data: null };
  const brand = (org?.brand ?? {}) as { accentColor?: string };
  const isBranded = Boolean(org && !org.is_internal);

  if (!client || client.status === "churned") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6 text-center">
        <Card className="max-w-sm p-2">
          <CardContent>
            <h1 className="font-heading text-xl font-semibold">No portal access found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t find a project registered under {user.email}. Contact Hamish AI if you think this is
              a mistake.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (membership && !membership.acceptedAt) {
    const admin = getSupabaseAdmin();
    if (admin) await markMembershipAccepted(admin, membership.clientId, user.email);
  }

  // Lean, dedicated fetch (not the full buildPortalInsights computation)
  // since this runs on every portal page load, not just Insights visits.
  const recentEvents = await getRecentPortalEvents(supabase, client.id, 8);

  return (
    <div
      className="min-h-screen bg-secondary/20"
      style={isBranded && brand.accentColor ? ({ "--accent": brand.accentColor } as React.CSSProperties) : undefined}
    >
      <PortalThemeInitScript />
      <header className="relative border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/portal" className="font-heading text-lg font-semibold">
            {isBranded ? (
              org!.name
            ) : (
              <>
                Hamish<span className="text-accent">AI</span>
              </>
            )}
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell events={recentEvents} />
            <div className="hidden md:block">
              <PortalThemeToggle />
            </div>
            <form action="/api/portal/logout" method="post" className="hidden md:block">
              <Button type="submit" variant="ghost" size="sm" className="ml-1 text-muted-foreground">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
            <PortalMobileNav />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-6">
        <PortalSidebar />
        <main className="min-w-0 flex-1 py-10">{children}</main>
      </div>
    </div>
  );
}
