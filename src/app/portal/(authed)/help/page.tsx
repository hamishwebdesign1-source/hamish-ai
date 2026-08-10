import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getPortalMembership } from "@/lib/portal-membership";
import { AskSupportAgent } from "@/components/portal/ask-support-agent";
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
        Answers to common questions. Anything not covered here, just ask below or submit a request.
      </p>

      <div className="mt-6">
        <AskSupportAgent clientId={clientId} />
      </div>

      <div className="mt-8">
        <h2 className="text-section-title">Frequently asked</h2>
        {!entries?.length && (
          <Card className="mt-3">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <BookOpen className="size-6 text-muted-foreground/60" />
              Nothing published yet — ask above and we&apos;ll build this out.
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
    </div>
  );
}
