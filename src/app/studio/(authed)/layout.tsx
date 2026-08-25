import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Button } from "@/components/ui/button";
import { StudioSidebar } from "@/components/platform/studio-nav";
import { StudioMobileNav } from "@/components/platform/studio-mobile-nav";
import { StudioCommandPalette } from "@/components/platform/studio-command-palette";
import { StudioCommandPaletteTrigger } from "@/components/platform/studio-command-palette-trigger";
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
      {/* Studio Mission Control redesign — dark, deliberately, not a mode
          a user toggles (see globals.css's own comment on .studio-shell
          for the full reasoning). bg-background (solid) replaces the old
          bg-secondary/20 (a 20%-opacity tint over the site's light page)
          on purpose: that tint was designed to sit over a light body, and
          at 20% opacity over the new dark scope it would let the site's
          still-light global background bleed through underneath.
          text-foreground alongside it for the same reason body itself
          pairs bg-background with text-foreground: `color` inherits as
          an already-resolved value, not a live var() re-evaluation — any
          descendant with no text-* class of its own (a bare <h1>, this
          layout's own logo Link) would otherwise inherit body's
          light-mode near-black text straight through this dark scope,
          nearly invisible against it. Re-asserting color here is what
          makes this div a real new inheritance root, the same way body
          is for the rest of the site. */}
      <div className="dark studio-shell min-h-screen bg-background text-foreground">
        <StudioCommandPalette />
        <header className="relative border-b border-border/60 bg-background">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
            <Link href="/studio" className="shrink-0 font-heading text-lg font-semibold">
              {org?.name ?? "Your Agency"}
              <span className="ml-2 font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
                Studio
              </span>
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <div className="w-full max-w-40 sm:max-w-56">
                <StudioCommandPaletteTrigger />
              </div>
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
