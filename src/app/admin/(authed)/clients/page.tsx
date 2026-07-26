import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Users } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import { packages, analyticsPackage } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const packageOptions = [...packages.map((p) => p.name), analyticsPackage.name];

const selectClasses =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

async function addClient(formData: FormData) {
  "use server";
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("clients").insert({
    name: String(formData.get("name") || ""),
    business_name: String(formData.get("business_name") || ""),
    email: String(formData.get("email") || "") || null,
    package: String(formData.get("package") || "") || null,
    maintenance_plan: String(formData.get("maintenance_plan") || "none"),
    website_url: String(formData.get("website_url") || "") || null,
    tech_stack: String(formData.get("tech_stack") || "") || null,
    brand_notes: String(formData.get("brand_notes") || "") || null,
  });

  if (error) console.error("Failed to insert client:", error);

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
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const supabase = getSupabaseAdmin();
  const { data: allClients, error: clientsError } = supabase
    ? await supabase.from("clients").select("*").order("created_at", { ascending: false })
    : { data: [], error: null };
  if (clientsError) console.error("Failed to fetch clients:", clientsError);

  const clients = statusFilter ? allClients?.filter((c) => (c.status ?? "active") === statusFilter) : allClients;
  const activeCount = allClients?.filter((c) => (c.status ?? "active") === "active").length ?? 0;
  const pausedCount = allClients?.filter((c) => c.status === "paused").length ?? 0;
  const churnedCount = allClients?.filter((c) => c.status === "churned").length ?? 0;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a client, then log requests against them to run the AI triage pipeline.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a client</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addClient} className="mt-2 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Contact name</Label>
                <Input id="name" name="name" placeholder="Chris Munro" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business name</Label>
                <Input id="business_name" name="business_name" placeholder="Craigie & Sons Joinery" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="chris@example.com" />
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
                <Input id="website_url" name="website_url" type="url" placeholder="https://example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tech_stack">Tech stack</Label>
                <Input id="tech_stack" name="tech_stack" placeholder="Squarespace, WordPress, custom…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand_notes">Brand / tone notes</Label>
                <Textarea id="brand_notes" name="brand_notes" placeholder="Optional context for the AI triage agent." rows={3} />
              </div>
              <Button type="submit" className="w-full">
                Add client
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-heading text-lg font-medium">All clients</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/clients">
              <Badge variant={!statusFilter ? "default" : "outline"}>All ({allClients?.length ?? 0})</Badge>
            </Link>
            <Link href="/admin/clients?status=active">
              <Badge variant={statusFilter === "active" ? "default" : "outline"}>Active ({activeCount})</Badge>
            </Link>
            <Link href="/admin/clients?status=paused">
              <Badge variant={statusFilter === "paused" ? "default" : "outline"}>Paused ({pausedCount})</Badge>
            </Link>
            <Link href="/admin/clients?status=churned">
              <Badge variant={statusFilter === "churned" ? "default" : "outline"}>Churned ({churnedCount})</Badge>
            </Link>
          </div>
          {!clients?.length && (
            <Card className="mt-3">
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Users className="size-6 text-muted-foreground/60" />
                No clients yet — add your first one.
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
