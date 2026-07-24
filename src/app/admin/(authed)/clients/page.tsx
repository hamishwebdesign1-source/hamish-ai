import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { packages, analyticsPackage } from "@/lib/site-config";

const packageOptions = [...packages.map((p) => p.name), analyticsPackage.name];

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

export default async function ClientsPage() {
  const supabase = getSupabaseAdmin();
  const { data: clients, error: clientsError } = supabase
    ? await supabase.from("clients").select("*").order("created_at", { ascending: false })
    : { data: [], error: null };
  if (clientsError) console.error("Failed to fetch clients:", clientsError);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a client, then log requests against them to run the AI triage pipeline.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-border p-5">
          <h2 className="font-heading text-lg font-medium">Add a client</h2>
          <form action={addClient} className="mt-4 space-y-3">
            <input
              name="name"
              placeholder="Contact name"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <input
              name="business_name"
              placeholder="Business name"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <select
              name="package"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">No package set</option>
              {packageOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              name="maintenance_plan"
              defaultValue="none"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="none">No maintenance plan</option>
              <option value="basic">Basic maintenance</option>
              <option value="growth">Growth Partnership</option>
            </select>
            <input
              name="website_url"
              type="url"
              placeholder="Website URL (optional, e.g. https://example.com)"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <input
              name="tech_stack"
              placeholder="Tech stack (optional)"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <textarea
              name="brand_notes"
              placeholder="Brand / tone notes (optional)"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Add client
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-heading text-lg font-medium">All clients</h2>
          {!clients?.length && (
            <p className="mt-3 text-sm text-muted-foreground">No clients yet — add your first one.</p>
          )}
          <ul className="mt-4 space-y-2">
            {clients?.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clients/${c.id}`}
                  className="card-interactive flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{c.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.package || "No package"} · {c.maintenance_plan} plan
                    </p>
                  </div>
                  <span className="text-xs text-accent">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
