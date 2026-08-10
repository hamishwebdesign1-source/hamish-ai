import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default async function PortalHelpPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const membership = await getPortalMembership(supabase, user.email);
  if (!membership) redirect("/portal/login");
  const clientId = membership.clientId;

  const { data: entries } = await supabase
    .from("knowledge_base")
    .select("id, title, content")
    .or(`client_id.eq.${clientId},client_id.is.null`)
    .order("title");

  return (
    <div>
      <h1 className="text-page-title">Help</h1>
      <p className="text-page-subtitle mt-1">
        Answers to common questions. Anything not covered here, ask HamishAI or submit a request.
      </p>

      <div className="mt-8">
        <h2 className="text-section-title">Frequently asked</h2>
        {!entries?.length && (
          <Card className="mt-3">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <BookOpen className="size-6 text-muted-foreground/60" />
              Nothing published yet — ask HamishAI below and we&apos;ll build this out.
            </CardContent>
          </Card>
        )}
        {!!entries?.length && (
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
          Still stuck? Ask HamishAI — answered from your real account data.
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
