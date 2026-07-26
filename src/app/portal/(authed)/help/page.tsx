import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AskSupportAgent } from "@/components/portal/ask-support-agent";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default async function PortalHelpPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const admin = getSupabaseAdmin();
  if (!admin) redirect("/portal/login");

  const { data: client } = await admin.from("clients").select("id").eq("email", user.email).single();
  if (!client) redirect("/portal/login");

  const { data: entries } = await admin
    .from("knowledge_base")
    .select("id, title, content")
    .or(`client_id.eq.${client.id},client_id.is.null`)
    .order("title");

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Help</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Answers to common questions. Anything not covered here, just ask below or submit a request.
      </p>

      <div className="mt-6">
        <AskSupportAgent clientId={client.id} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Frequently asked</h2>
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
