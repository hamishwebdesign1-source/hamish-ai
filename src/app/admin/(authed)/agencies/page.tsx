import { revalidatePath } from "next/cache";
import { Building2, TriangleAlert } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Unlike every other data-driven /admin page (activity-log, clients,
// knowledge, …), this one reads no searchParams/cookies of its own — the
// only thing that would otherwise force Next to treat it as dynamic
// rather than pre-rendering it once at build time and serving stale
// pending-deletion-request data forever after. Explicit here since
// there's no natural per-request signal to lean on the way the other
// pages incidentally get one.
export const dynamic = "force-dynamic";

// Studio big-ticket ("org deletion requests have no admin resolution
// path") — requestAccountDeletion() (Studio Settings, settings/
// actions.ts) has written organisations.deletion_requested_at since
// GDPR minimum-viable compliance part 3 shipped, and Settings' own UI
// (data-privacy-panel.tsx) tells a tenant "we'll confirm with you
// before anything is actually removed" -- but nothing in /admin ever
// showed this list or let anyone act on it. Deliberately NOT an
// automated erasure button here, same reasoning
// schema-account-deletion-request.sql's own comment already gives for
// why this stayed request-mediated: destroying an entire org's data
// (prospects, clients, invoices, a live Stripe Connect account) needs a
// real human doing the actual deletion work by hand, not a second
// unconfirmed click. This page is the missing "see it, resolve it"
// surface -- mark a request handled once the real erasure work is
// actually done.
async function markDeletionProcessed(orgId: string) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("organisations").update({ deletion_requested_at: null }).eq("id", orgId);
  if (error) {
    console.error("Failed to clear deletion_requested_at:", error);
    return;
  }

  await logAuditEvent({
    actor: "admin",
    action: "organisation.deletion_request_processed",
    targetType: "organisation",
    targetId: orgId,
    orgId,
  });

  revalidatePath("/admin/agencies");
}

export default async function AgenciesPage() {
  const supabase = getSupabaseAdmin();

  const { data: orgs } = supabase
    ? await supabase
        .from("organisations")
        .select("id, name, slug, plan, is_internal, created_at, deletion_requested_at")
        .order("deletion_requested_at", { ascending: true, nullsFirst: false })
    : { data: null };

  const pendingDeletion = (orgs ?? []).filter((o) => o.deletion_requested_at);
  const active = (orgs ?? []).filter((o) => !o.deletion_requested_at && !o.is_internal);

  return (
    <div>
      <h1 className="text-page-title">Agencies</h1>
      <p className="text-page-subtitle mt-1">Every Agency Platform tenant org, and any pending account-deletion requests.</p>

      {pendingDeletion.length > 0 && (
        <div className="mt-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <TriangleAlert className="size-4" /> {pendingDeletion.length} pending deletion request{pendingDeletion.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 space-y-2">
            {pendingDeletion.map((org) => (
              <Card key={org.id} className="border-destructive/30">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {new Date(org.deletion_requested_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·
                      Plan: {org.plan}
                    </p>
                  </div>
                  <form action={markDeletionProcessed.bind(null, org.id)}>
                    <Button type="submit" size="sm" variant="destructive">
                      Mark processed
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            &ldquo;Mark processed&rdquo; only clears the flag once you&apos;ve actually carried out the erasure by hand — it doesn&apos;t delete anything itself.
          </p>
        </div>
      )}

      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Building2 className="size-4" /> {active.length} active tenant{active.length === 1 ? "" : "s"}
        </p>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No tenant organisations yet.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {active.map((org) => (
              <Card key={org.id}>
                <CardContent className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(org.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {org.plan}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
