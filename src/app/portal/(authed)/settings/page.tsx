import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Building2, Bell, Users } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function updateNotificationPreference(clientId: string, enabled: boolean) {
  "use server";
  const supabase = await createServerSupabaseClient();
  // Session-scoped client, deliberately — RLS + a column-level grant
  // (schema-portal-settings.sql) mean this can only ever touch
  // weekly_digest_enabled on the caller's own client row, nothing else.
  const { error } = await supabase.from("clients").update({ weekly_digest_enabled: enabled }).eq("id", clientId);
  if (error) console.error("Failed to update notification preference:", error);
  revalidatePath("/portal/settings");
}

export default async function PortalSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");
  const clientId = membership.clientId;

  const { data: client } = await supabase
    .from("clients")
    .select("id, business_name, weekly_digest_enabled")
    .eq("id", clientId)
    .single();
  if (!client) redirect("/portal/login");

  // client_members_select_team (schema-portal-settings.sql) is what makes
  // this return every member of the client, not just the caller's own row.
  const { data: members } = await supabase
    .from("client_members")
    .select("id, email, role, accepted_at")
    .eq("client_id", clientId)
    .order("invited_at", { ascending: true });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your organisation, notifications, and who has access.</p>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Building2 className="size-4" />
              Organisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{client.business_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Business name is set up during onboarding — email us if it needs to change.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Bell className="size-4" />
              Notifications
            </CardTitle>
            <CardDescription>Your weekly email summary of what&apos;s still open.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Weekly digest email</p>
                <p className="text-xs text-muted-foreground">
                  Sent only when something&apos;s actually outstanding — no empty &quot;nothing to report&quot; emails.
                </p>
              </div>
              <form action={updateNotificationPreference.bind(null, client.id, !client.weekly_digest_enabled)}>
                <Button type="submit" size="sm" variant={client.weekly_digest_enabled ? "default" : "outline"}>
                  {client.weekly_digest_enabled ? "On" : "Off"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Users className="size-4" />
              Team
            </CardTitle>
            <CardDescription>
              Everyone who can sign in to this portal. Contact Hamish AI to add or remove someone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!members?.length && <p className="text-sm text-muted-foreground">No portal access set up yet.</p>}
            {!!members?.length && (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <p className="text-sm font-medium">{m.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.role === "owner" ? "Owner" : "Member"} · {m.accepted_at ? "Active" : "Invited"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
