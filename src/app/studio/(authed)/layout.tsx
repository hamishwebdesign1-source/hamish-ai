import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Button } from "@/components/ui/button";
import { StudioSidebar } from "@/components/platform/studio-nav";
import { StudioMobileNav } from "@/components/platform/studio-mobile-nav";
import { HelpModeProvider } from "@/components/platform/help-mode-context";
import { HelpModeToggle } from "@/components/platform/help-mode-toggle";
import { StudioTour } from "@/components/platform/studio-tour";
import { IdentifyOrg } from "@/components/platform/identify-org";

// Same shape as portal/(authed)/layout.tsx, one level up: session check,
// then a membership-based gate, session-scoped client throughout so RLS
// (organisations_select_own / prospects_select_own_org) enforces the same
// boundary independently of this .eq() getting it right.
//
// Unlike the portal layout's "no portal access found" error card, no
// membership here redirects to /platform/onboarding rather than showing a
// dead end — a verified session with no org is the expected state for
// someone who hasn't finished signing up yet, not a mistake to explain.
export default async function StudioAuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: org } = await supabase.from("organisations").select("name, tour_completed_at").eq("id", membership.orgId).single();

  return (
    <HelpModeProvider>
      <IdentifyOrg orgId={membership.orgId} />
      {!org?.tour_completed_at && <StudioTour />}
      <div className="min-h-screen bg-secondary/20">
        <header className="relative border-b border-border/60 bg-background">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/studio" className="font-heading text-lg font-semibold">
              {org?.name ?? "Your Agency"}
              <span className="ml-2 font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
                Studio
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <HelpModeToggle />
              </div>
              <form action="/api/platform/logout" method="post" className="hidden md:block">
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
              <StudioMobileNav />
            </div>
          </div>
        </header>
        <div className="mx-auto flex max-w-6xl gap-8 px-6">
          <StudioSidebar />
          <main className="min-w-0 flex-1 py-10">{children}</main>
        </div>
      </div>
    </HelpModeProvider>
  );
}
