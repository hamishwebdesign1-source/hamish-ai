import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Card, CardContent } from "@/components/ui/card";

// Session-scoped client, RLS-enforced via clients_select_own_org
// (schema-rls-clients-org-staff.sql) — a plain filtered query would look
// identical, RLS is what actually guarantees it's correct.
export default async function StudioClientsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, business_name, email, website_url, created_at")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone you&apos;ve converted from a prospect. Each one gets their own portal login at{" "}
        <span className="font-mono text-xs">hamishai.org/portal</span>, branded to your agency.
      </p>

      {!clients || clients.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No clients yet — convert a prospect from{" "}
            <a href="/studio/prospects" className="text-accent underline underline-offset-2">
              Prospects
            </a>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {clients.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.business_name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <p className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
