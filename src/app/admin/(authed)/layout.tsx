import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { AdminSidebar } from "@/components/admin/sidebar";
import { ThemeToggle, ThemeInitScript } from "@/components/admin/theme-toggle";
import { Button } from "@/components/ui/button";

async function signOut() {
  "use server";
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

// Portal redesign Stage 3 — sidebar replaces the old flat top-nav row (see
// sidebar.tsx for why: grouping, not just restyling). The header keeps
// only what's genuinely global — brand, theme, sign-out — everything
// page-navigational moved into the sidebar/mobile drawer.
export default function AdminAuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/20">
      <ThemeInitScript />
      <header className="relative border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-heading text-lg font-semibold">
            Hamish<span className="text-accent">AI</span>{" "}
            <span className="font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
              Internal
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="ml-1 text-muted-foreground">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
          <AdminMobileNav signOutAction={signOut} />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1 py-10">{children}</main>
      </div>
    </div>
  );
}
