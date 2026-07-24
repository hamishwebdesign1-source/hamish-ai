import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export default async function PortalAuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/portal/login");
  }

  const admin = getSupabaseAdmin();
  const { data: client } = admin
    ? await admin.from("clients").select("id, business_name").eq("email", user.email).single()
    : { data: null };

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-heading text-xl font-semibold">No portal access found</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We couldn&apos;t find a project registered under {user.email}. Contact Hamish AI if you think this is a
            mistake.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <p className="font-heading text-lg font-semibold">
            Hamish<span className="text-accent">AI</span>
          </p>
          <form action="/api/portal/logout" method="post">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
