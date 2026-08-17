import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Users, FileText, CheckCircle2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getOrgMembership } from "@/lib/org-membership";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/eyebrow";
import { Badge } from "@/components/ui/badge";

// The end of the onboarding journey (Section 5, step 6 — "workspace
// generated"). Week 5 adds the first real piece past this confirmation
// screen — prospecting, at /studio/prospects. Client management and
// reporting stay "coming soon" until they're actually built.
export default async function StudioHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/platform/signup");

  const membership = await getOrgMembership(supabase, user.email);
  if (!membership) redirect("/platform/onboarding");

  const { data: org } = await supabase
    .from("organisations")
    .select("name, plan, prospecting_config")
    .eq("id", membership.orgId)
    .single();

  const config = (org?.prospecting_config ?? {}) as { agencyType?: string; services?: string[] };

  return (
    <div className="max-w-2xl">
      <Eyebrow>Workspace ready</Eyebrow>
      <h1 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">
        Welcome to {org?.name ?? "your agency"}.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your workspace is set up. Prospecting, client management and reporting land here next — you&apos;ll get
        access as part of the private beta.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="secondary">{config.agencyType ?? "Agency"}</Badge>
        <Badge variant="secondary" className="capitalize">{org?.plan ?? "starter"} plan</Badge>
      </div>

      {config.services && config.services.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <p className="font-heading text-sm font-semibold">What you&apos;re set up to sell</p>
            <ul className="mt-3 space-y-2 text-sm">
              {config.services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                  {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/studio/prospects" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center transition-colors hover:bg-accent/10">
          <Search className="mx-auto size-5 text-accent" />
          <p className="mt-2 font-heading text-sm font-semibold">Prospecting</p>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-accent uppercase">Ready</p>
        </Link>
        {[
          { icon: Users, label: "Client management", note: "Coming soon" },
          { icon: FileText, label: "Reporting", note: "Coming soon" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-dashed border-border p-4 text-center">
            <item.icon className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 font-heading text-sm font-semibold">{item.label}</p>
            <p className="mt-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
