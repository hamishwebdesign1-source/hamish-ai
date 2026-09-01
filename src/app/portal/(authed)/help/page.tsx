import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Sparkles, ArrowRight, Search } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { getPortalOrgBranding } from "@/lib/portal-org-branding";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

export default async function PortalHelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: searchQuery } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");
  const clientId = membership.clientId;

  const { data: client } = await supabase.from("clients").select("org_id").eq("id", clientId).single();
  const orgBranding = await getPortalOrgBranding(supabase, client?.org_id ?? null);

  // General entries (client_id null) scoped to this client's own org too
  // — see schema-knowledge-base-org-scope.sql and the same fix in
  // answer-account-question.ts.
  const orgFilter = client?.org_id ? `,and(client_id.is.null,org_id.eq.${client.org_id})` : "";
  const { data: allEntries } = await supabase
    .from("knowledge_base")
    .select("id, title, content")
    .or(`client_id.eq.${clientId}${orgFilter}`)
    .order("title");

  // Studio improvement — same threshold-gated (only once there's enough
  // to actually need it), client-side-over-already-fetched-rows search
  // pattern as /admin/knowledge (same knowledge_base table, same
  // accordion-adjacent list shape).
  const trimmedQuery = searchQuery?.trim().toLowerCase();
  const entries = trimmedQuery
    ? (allEntries ?? []).filter((e) => e.title.toLowerCase().includes(trimmedQuery) || e.content.toLowerCase().includes(trimmedQuery))
    : allEntries;

  return (
    <div>
      <h1 className="text-page-title">Help</h1>
      <p className="text-page-subtitle mt-1">
        Answers to common questions. Anything not covered here, ask {orgBranding.name} or submit a request.
      </p>

      <div className="mt-8">
        <h2 className="text-section-title">Frequently asked</h2>
        {(allEntries?.length ?? 0) > 4 && (
          <form action="/portal/help" className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={searchQuery ?? ""} placeholder="Search…" className="pl-8" />
          </form>
        )}
        {!allEntries?.length ? (
          <Card className="mt-3">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <BookOpen className="size-6 text-muted-foreground/60" />
              Nothing published yet — ask {orgBranding.name} below and we&apos;ll build this out.
            </CardContent>
          </Card>
        ) : !entries?.length ? (
          <Card className="mt-3">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <BookOpen className="size-6 text-muted-foreground/60" />
              No entries match that search.
            </CardContent>
          </Card>
        ) : (
          <Accordion className="mt-4">
            {entries.map((e) => (
              <AccordionItem key={e.id} value={e.id}>
                <AccordionTrigger className="text-sm font-medium">{e.title}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{e.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <Link
        href="/portal/ask"
        className="card-interactive mt-8 flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_oklch,var(--gradient-violet),transparent_75%)] bg-[color-mix(in_oklch,var(--gradient-violet),transparent_92%)] px-5 py-4"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 shrink-0 text-[var(--gradient-violet)]" />
          Still stuck? Ask {orgBranding.name} — answered from your real account data.
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
