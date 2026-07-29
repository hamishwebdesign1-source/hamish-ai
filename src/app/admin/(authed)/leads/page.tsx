import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ExternalLink, Search, X, Clock } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateLeadStatus, deleteLead, updateLeadEmail, updateLeadConceptSlug } from "@/app/admin/actions";
import { leadNeedsFollowUp as needsFollowUp } from "@/lib/lead-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailLeadButton } from "@/components/admin/email-lead-button";
import { cn } from "@/lib/utils";

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const STATUSES = ["needs_verification", "ready", "contacted", "not_fit"] as const;

const statusMeta: Record<(typeof STATUSES)[number], { label: string; variant: "warning" | "success" | "accent" | "secondary" }> = {
  needs_verification: { label: "Needs verification", variant: "warning" },
  ready: { label: "Ready for outreach", variant: "success" },
  contacted: { label: "Contacted", variant: "accent" },
  not_fit: { label: "Not a good fit", variant: "secondary" },
};

async function addLead(formData: FormData) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("prospects").insert({
    business_name: String(formData.get("business_name") || ""),
    category: String(formData.get("category") || "") || null,
    neighbourhood: String(formData.get("neighbourhood") || "") || null,
    website: String(formData.get("website") || "") || null,
    email: String(formData.get("email") || "") || null,
    score: formData.get("score") ? Number(formData.get("score")) : null,
    signal: String(formData.get("signal") || "") || null,
    outreach_note: String(formData.get("outreach_note") || "") || null,
    status: String(formData.get("status") || "needs_verification"),
  });

  if (error) console.error("Failed to insert lead:", error);

  revalidatePath("/admin/leads");
}

function websiteHref(website: string) {
  return website.startsWith("http") ? website : `https://${website.split(" ")[0]}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: allLeads, error } = supabase
    ? await supabase.from("prospects").select("*").order("score", { ascending: false })
    : { data: [], error: null };
  if (error) console.error("Failed to fetch leads:", error);

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: allLeads?.filter((l) => l.status === s).length ?? 0 }),
    {} as Record<string, number>
  );
  const followUpCount = allLeads?.filter(needsFollowUp).length ?? 0;

  const leads =
    statusFilter === "needs_followup"
      ? allLeads?.filter(needsFollowUp)
      : statusFilter
        ? allLeads?.filter((l) => l.status === statusFilter)
        : allLeads;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Central Belt of Scotland business prospects — researched weekly and worked through to outreach from here.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{allLeads?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total checked</p>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s} className="p-4">
            <p className="font-heading text-2xl font-semibold">{counts[s]}</p>
            <p className="text-xs text-muted-foreground">{statusMeta[s].label}</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="font-heading text-2xl font-semibold">{followUpCount}</p>
          <p className="text-xs text-muted-foreground">Needs follow-up</p>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/leads">
          <Badge variant={!statusFilter ? "default" : "outline"}>All</Badge>
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/leads?status=${s}`}>
            <Badge variant={statusFilter === s ? "default" : "outline"}>{statusMeta[s].label}</Badge>
          </Link>
        ))}
        <Link href="/admin/leads?status=needs_followup">
          <Badge variant={statusFilter === "needs_followup" ? "default" : "outline"} className="gap-1">
            <Clock className="size-3" />
            Needs follow-up
          </Badge>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addLead} className="mt-2 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name</Label>
                <Input id="business_name" name="business_name" placeholder="Orinoco Latin Food" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Restaurant" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="neighbourhood">Neighbourhood</Label>
                <Input id="neighbourhood" name="neighbourhood" placeholder="Leith Walk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="example.co.uk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Contact email</Label>
                <Input id="email" name="email" type="email" placeholder="hello@example.co.uk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="score">Score (0–5)</Label>
                <select id="score" name="score" defaultValue="" className={selectClasses}>
                  <option value="">Not scored</option>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signal">Signal found</Label>
                <Textarea id="signal" name="signal" placeholder="What's the concrete, specific finding?" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outreach_note">Outreach note</Label>
                <Textarea id="outreach_note" name="outreach_note" placeholder="Opening line / context for reaching out." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue="needs_verification" className={selectClasses}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusMeta[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                Add lead
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {!leads?.length && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Search className="size-6 text-muted-foreground/60" />
                No leads in this view yet.
              </CardContent>
            </Card>
          )}
          <ul className="space-y-3">
            {leads?.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{lead.business_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[lead.category, lead.neighbourhood].filter(Boolean).join(" · ")}
                      {lead.website && (
                        <>
                          {" · "}
                          <a
                            href={websiteHref(lead.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-accent hover:underline"
                          >
                            {lead.website}
                            <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {needsFollowUp(lead) && (
                      <Badge variant="warning" className="gap-1">
                        <Clock className="size-3" />
                        Needs follow-up
                      </Badge>
                    )}
                    {lead.score != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={cn(
                              "size-1.5 rounded-full",
                              n <= lead.score ? "bg-accent" : "bg-border"
                            )}
                          />
                        ))}
                      </div>
                    )}
                    <EmailLeadButton leadId={lead.id} email={lead.email} isFollowUp={lead.status === "contacted"} />
                    <form action={deleteLead.bind(null, lead.id)}>
                      <Button type="submit" variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>

                <form action={updateLeadEmail.bind(null, lead.id)} className="mt-2 flex items-center gap-1.5">
                  <Input
                    name="email"
                    type="email"
                    defaultValue={lead.email ?? ""}
                    placeholder="Add contact email…"
                    className="h-7 max-w-64 text-xs"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                </form>

                <form action={updateLeadConceptSlug.bind(null, lead.id)} className="mt-1.5 flex items-center gap-1.5">
                  <Input
                    name="concept_slug"
                    defaultValue={lead.concept_slug ?? ""}
                    placeholder="Concept page slug (e.g. c4-joinery)…"
                    className="h-7 max-w-64 text-xs"
                  />
                  <Button type="submit" variant="ghost" size="xs">
                    Save
                  </Button>
                  {lead.concept_slug && (
                    <a
                      href={`/concepts/${lead.concept_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                    >
                      View <ExternalLink className="size-3" />
                    </a>
                  )}
                </form>

                {lead.signal && <p className="mt-2 text-sm">{lead.signal}</p>}
                {lead.outreach_note && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Outreach: </span>
                    {lead.outreach_note}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <form key={s} action={updateLeadStatus.bind(null, lead.id, s)}>
                      <Button
                        type="submit"
                        size="xs"
                        variant={lead.status === s ? "default" : "outline"}
                      >
                        {statusMeta[s].label}
                      </Button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
