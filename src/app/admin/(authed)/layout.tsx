import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, Plug, Search, Workflow, ShieldCheck, History, LogOut } from "lucide-react";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { AdminNavLink } from "@/components/admin/nav-link";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { Button } from "@/components/ui/button";

async function signOut() {
  "use server";
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

export default function AdminAuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="relative border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-heading text-lg font-semibold">
            Hamish<span className="text-accent">AI</span>{" "}
            <span className="font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
              Internal
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <AdminNavLink href="/admin">
              <LayoutDashboard className="size-4" />
              Overview
            </AdminNavLink>
            <AdminNavLink href="/admin/clients">
              <Users className="size-4" />
              Clients
            </AdminNavLink>
            <AdminNavLink href="/admin/leads">
              <Search className="size-4" />
              Leads
            </AdminNavLink>
            <AdminNavLink href="/admin/knowledge">
              <BookOpen className="size-4" />
              Knowledge
            </AdminNavLink>
            <AdminNavLink href="/admin/google-setup">
              <Plug className="size-4" />
              Google
            </AdminNavLink>
            <AdminNavLink href="/admin/process">
              <Workflow className="size-4" />
              Process
            </AdminNavLink>
            <AdminNavLink href="/admin/audit">
              <ShieldCheck className="size-4" />
              Audit
            </AdminNavLink>
            <AdminNavLink href="/admin/activity-log">
              <History className="size-4" />
              Activity
            </AdminNavLink>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="ml-2 text-muted-foreground">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </nav>
          <AdminMobileNav signOutAction={signOut} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
