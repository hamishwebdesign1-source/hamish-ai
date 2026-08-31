import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Users, Search, X } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendClientEmail } from "@/lib/send-client-email";
import { logAuditEvent } from "@/lib/audit-log";
import { packages, analyticsPackage } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";

const packageOptions = [...packages.map((p) => p.name), analyticsPackage.name];

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

async function addClient(formData: FormData) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const businessName = String(formData.get("business_name") || "");

  // This "Email" field used to be stored on the client and silently do
  // nothing else — portal login is decided entirely by client_members
  // (see lib/portal-membership.ts), which nothing here ever wrote to. An
  // admin filling this in reasonably expects it to grant the client portal
  // access; it didn't, with no warning. Found and documented in
  // docs/lily-golf-test-project.md Phase 8. Fixed here by having this
  // field do what it looks like it does: also invite that email as the
  // client's owner, same as the real "Invite by email" flow on the client
  // detail page — one thing, not a second dead-looking copy of it.
  if (email) {
    const { data: existingElsewhere } = await supabase
      .from("client_members")
      .select("client_id, clients(business_name)")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existingElsewhere) {
      const otherBusinessName =
        (existingElsewhere.clients as unknown as { business_name?: string } | null)?.business_name ?? "another client";
      redirect(
        `/admin/clients?member_error=${encodeURIComponent(
          `${email} already has portal access to ${otherBusinessName} — one email can only belong to one client's portal today. The client was not created with this email attached.`
        )}`
      );
    }
  }

  // Phase 8 finding #2 — when this form was reached via "Convert to
  // client" on a lead, these hidden fields carry the lead's concept page
  // and the real link back across, so the two records are actually
  // related afterward, not just copied once and forgotten.
  const sourceLeadId = String(formData.get("source_lead_id") || "").trim() || null;
  const conceptSlug = String(formData.get("concept_slug") || "").trim() || null;

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name: String(formData.get("name") || ""),
      business_name: businessName,
      email,
      package: String(formData.get("package") || "") || null,
      maintenance_plan: String(formData.get("maintenance_plan") || "none"),
      website_url: String(formData.get("website_url") || "") || null,
      tech_stack: String(formData.get("tech_stack") || "") || null,
      brand_notes: String(formData.get("brand_notes") || "") || null,
      source_lead_id: sourceLeadId,
      concept_slug: conceptSlug,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert client:", error);
  } else if (client) {
    if (email) {
      const { error: memberError } = await supabase
        .from("client_members")
        .insert({ client_id: client.id, email, role: "owner", invited_by: "admin" });
      if (memberError) {
        console.error("Failed to grant portal access on client creation:", memberError);
      } else {
        await logAuditEvent({
          actor: "admin",
          action: "client_member.invited",
          targetType: "client_member",
          clientId: client.id,
          metadata: { email, role: "owner", via: "client_creation" },
        });
        await sendClientEmail(
          email,
          `You've been added to ${businessName}'s Hamish AI portal`,
          `Hi,\n\nYou now have access to ${businessName}'s Hamish AI client portal.\n\nSign in any time at https://hamishai.org/portal/login with this email address (${email}) — we'll send you a one-time login link, no password needed.\n\n— Hamish AI`
        );
      }
    }

    if (sourceLeadId) {
      await logAuditEvent({
        actor: "admin",
        action: "lead.converted_to_client",
        targetType: "prospect",
        targetId: sourceLeadId,
        clientId: client.id,
        metadata: { business_name: businessName },
      });
      revalidatePath(`/admin/leads/${sourceLeadId}`);
      redirect(`/admin/clients/${client.id}`);
    }
  }

  revalidatePath("/admin/clients");
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const planVariant = {
  none: "secondary",
  basic: "accent",
  growth: "warning",
} as const;

const planLabel: Record<string, string> = {
  none: "No maintenance plan",
  basic: "Basic maintenance",
  growth: "Growth partnership",
};

const clientStatusVariant: Record<string, "success" | "warning" | "secondary"> = {
  active: "success",
  paused: "warning",
  churned: "secondary",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; member_error?: string; from_lead?: string; q?: string }>;
}) {
  const { status: statusFilter, member_error: memberError, from_lead: fromLeadId, q: searchQuery } = await searchParams;
  const supabase = getSupabaseAdmin();
  const { data: allClients, error: clientsError } = supabase
    ? await supabase.from("clients").select("*").order("created_at", { ascending: false })
    : { data: [], error: null };
  if (clientsError) console.error("Failed to fetch clients:", clientsError);

  // "Convert to client" pre-fill — real data carried across from the lead
  // instead of retyping it, per Phase 8 finding #2 in
  // docs/lily-golf-test-project.md. Still a real form the admin reviews
  // and submits, not a silent one-click conversion.
  const { data: fromLead } =
    fromLeadId && supabase
      ? await supabase
          .from("prospects")
          .select("business_name, email, website, concept_slug, notes")
          .eq("id", fromLeadId)
          .maybeSingle()
      : { data: null };

  const statusFiltered = statusFilter ? allClients?.filter((c) => (c.status ?? "active") === statusFilter) : allClients;
  const activeCount = allClients?.filter((c) => (c.status ?? "active") === "active").length ?? 0;
  const pausedCount = allClients?.filter((c) => c.status === "paused").length ?? 0;
  const churnedCount = allClients?.filter((c) => c.status === "churned").length ?? 0;

  // Studio improvement — the same long-flat-list shape that motivated
  // Studio's own clients-panel.tsx search fix, ported here. Same "search
  // across every plausible identifying field" pattern as admin/leads'
  // own q param (leads/page.tsx), narrowed to the fields this table
  // actually has.
  const trimmedQuery = searchQuery?.trim().toLowerCase();
  const clients = trimmedQuery
    ? statusFiltered?.filter((c) =>
        [c.business_name, c.email, c.website_url].some((field) => field && String(field).toLowerCase().includes(trimmedQuery))
      )
    : statusFiltered;

  function filterHref(overrides: { status?: string; q?: string }) {
    const next = { status: statusFilter, q: searchQuery, ...overrides };
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/admin/clients?${qs}` : "/admin/clients";
  }

  return (
    <div>
      <h1 className="text-page-title">Clients</h1>
      <p className="text-page-subtitle mt-1">
        Add a client, then log requests against them to run the AI triage pipeline.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a client</CardTitle>
          </CardHeader>
          <CardContent>
            {memberError && (
              <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{memberError}</p>
            )}
            {fromLead && (
              <p className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                Pre-filled from the lead &ldquo;{fromLead.business_name}&rdquo; — review and edit before saving.
                {fromLead.concept_slug && ` Its concept page (${fromLead.concept_slug}) will carry over too.`}
              </p>
            )}
            <form action={addClient} className="mt-2 space-y-3">
              {fromLeadId && <input type="hidden" name="source_lead_id" value={fromLeadId} />}
              {fromLead?.concept_slug && <input type="hidden" name="concept_slug" value={fromLead.concept_slug} />}
              <div className="space-y-1.5">
                <Label htmlFor="name">Contact name</Label>
                <Input id="name" name="name" placeholder="Chris Munro" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name</Label>
                <Input
                  id="business_name"
                  name="business_name"
                  placeholder="Craigie & Sons Joinery"
                  defaultValue={fromLead?.business_name ?? ""}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email — grants portal access</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="chris@example.com"
                  defaultValue={fromLead?.email ?? ""}
                />
                <p className="text-[11px] text-muted-foreground">
                  If set, this email can sign in at /portal/login immediately as the owner — same as inviting them
                  from the client&apos;s Team tab. Leave blank to add portal access later instead.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="package">Package</Label>
                <select id="package" name="package" className={selectClasses}>
                  <option value="">No package set</option>
                  {packageOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maintenance_plan">Maintenance plan</Label>
                <select id="maintenance_plan" name="maintenance_plan" defaultValue="none" className={selectClasses}>
                  <option value="none">No maintenance plan</option>
                  <option value="basic">Basic maintenance</option>
                  <option value="growth">Growth Partnership</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  name="website_url"
                  type="url"
                  placeholder="https://example.com"
                  defaultValue={fromLead?.website ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tech_stack">Tech stack</Label>
                <Input id="tech_stack" name="tech_stack" placeholder="Squarespace, WordPress, custom…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand_notes">Brand / tone notes</Label>
                <Textarea
                  id="brand_notes"
                  name="brand_notes"
                  placeholder="Optional context for the AI triage agent."
                  rows={3}
                  defaultValue={fromLead?.notes ?? ""}
                />
              </div>
              <Button type="submit" className="w-full">
                {fromLead ? "Convert to client" : "Add client"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-section-title">All clients</h2>
          <div className="mt-3">
            <FilterTabs
              activeKey={statusFilter}
              options={[
                { key: undefined, label: "All", count: allClients?.length ?? 0, href: filterHref({ status: undefined }) },
                { key: "active", label: "Active", count: activeCount, href: filterHref({ status: "active" }) },
                { key: "paused", label: "Paused", count: pausedCount, href: filterHref({ status: "paused" }) },
                { key: "churned", label: "Churned", count: churnedCount, href: filterHref({ status: "churned" }) },
              ]}
            />
          </div>
          {/* GET form, not a client component — keeps this page a plain
              server component, same admin/leads' own search precedent. */}
          <form action="/admin/clients" className="mt-3 flex items-center gap-2">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={searchQuery ?? ""} placeholder="Search by name, email, or website…" className="h-9 pl-8" />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
            {trimmedQuery && (
              <Link href={filterHref({ q: undefined })}>
                <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground">
                  <X className="size-4" />
                </Button>
              </Link>
            )}
          </form>
          {!clients?.length && (
            <Card className="mt-3">
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Users className="size-6 text-muted-foreground/60" />
                {trimmedQuery ? "No clients match that search." : "No clients yet — add your first one."}
              </CardContent>
            </Card>
          )}
          <ul className="mt-4 space-y-2">
            {clients?.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clients/${c.id}`}
                  className="card-interactive flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-heading text-sm font-semibold text-accent">
                    {initials(c.business_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.business_name}</p>
                    <CardDescription className="mt-0.5 truncate">
                      {c.package || "No package"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {c.status && c.status !== "active" && (
                      <Badge variant={clientStatusVariant[c.status] ?? "secondary"} className="capitalize">
                        {c.status}
                      </Badge>
                    )}
                    <Badge variant={planVariant[c.maintenance_plan as keyof typeof planVariant] ?? "secondary"}>
                      {planLabel[c.maintenance_plan] ?? c.maintenance_plan}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
