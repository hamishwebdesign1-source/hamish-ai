import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Button } from "@/components/ui/button";
import { StudioNav } from "@/components/platform/studio-nav";

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

  const { data: org } = await supabase.from("organisations").select("name").eq("id", membership.orgId).single();

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/studio" className="font-heading text-lg font-semibold">
            {org?.name ?? "Your Agency"}
            <span className="ml-2 font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
              Studio
            </span>
          </Link>
          <form action="/api/platform/logout" method="post">
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <StudioNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
