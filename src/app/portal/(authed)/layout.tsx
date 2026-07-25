import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
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

  const admin = getSupabaseAdmin();
  const { data: client } = admin
    ? await admin.from("clients").select("id, business_name").eq("email", user.email).single()
    : { data: null };

  if (!client) {
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

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <p className="font-heading text-lg font-semibold">
            Hamish<span className="text-accent">AI</span>
          </p>
          <form action="/api/portal/logout" method="post">
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
