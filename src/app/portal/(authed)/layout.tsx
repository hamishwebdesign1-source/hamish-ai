import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, MessagesSquare, Receipt, LineChart, LifeBuoy, LogOut } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getPortalMembership, markMembershipAccepted } from "@/lib/portal-membership";
import { PortalNavLink } from "@/components/portal/nav-link";
import { PortalMobileNav } from "@/components/portal/mobile-nav";
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
    ? await supabase.from("clients").select("id, business_name, status").eq("id", membership.clientId).single()
    : { data: null };

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

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="relative border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/portal" className="font-heading text-lg font-semibold">
            Hamish<span className="text-accent">AI</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <PortalNavLink href="/portal">
              <LayoutDashboard className="size-4" />
              Overview
            </PortalNavLink>
            <PortalNavLink href="/portal/requests">
              <MessagesSquare className="size-4" />
              Requests
            </PortalNavLink>
            <PortalNavLink href="/portal/billing">
              <Receipt className="size-4" />
              Billing
            </PortalNavLink>
            <PortalNavLink href="/portal/insights">
              <LineChart className="size-4" />
              Insights
            </PortalNavLink>
            <PortalNavLink href="/portal/help">
              <LifeBuoy className="size-4" />
              Help
            </PortalNavLink>
            <form action="/api/portal/logout" method="post">
              <Button type="submit" variant="ghost" size="sm" className="ml-2 text-muted-foreground">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </nav>
          <PortalMobileNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
