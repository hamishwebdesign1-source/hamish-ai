import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

async function signOut() {
  "use server";
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

export default function AdminAuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/admin/clients" className="font-heading text-lg font-semibold">
            Hamish<span className="text-accent">AI</span>{" "}
            <span className="font-mono text-xs font-normal tracking-wide text-muted-foreground uppercase">
              Internal
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">
              Clients
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
