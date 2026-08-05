import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface Stage {
  number: string;
  title: string;
  summary: string;
  steps: string[];
}

// Plain-English mirror of the flowchart below — same 7 stages, same node IDs
// implicitly, just written for a reader who doesn't want to parse Mermaid.
// Keep this in sync with DIAGRAM in process-diagram.tsx whenever a stage's
// actual behaviour changes, not just its diagram label.
const STAGES: Stage[] = [
  {
    number: "1",
    title: "Lead Generation",
    summary: "Finding businesses worth reaching out to, without spamming anyone.",
    steps: [
      "A scheduled research task runs weekly, scanning local Central Belt of Scotland businesses and adding promising ones as prospects.",
      "Every prospect is verified and scored before anything is sent — no cold list gets emailed wholesale.",
      "Once a prospect is ready, Claude drafts a personalised outreach email, matched to a similar client case study.",
      "Hamish sends it manually via Gmail — nothing goes out without a human actually pressing send.",
      "No reply within 5 days? It's flagged for a follow-up rather than silently dropped.",
      "A reply that turns into a yes becomes a client, moving on to onboarding.",
    ],
  },
  {
    number: "2",
    title: "Client Onboarding",
    summary: "Setting up access and a billing arrangement for a new client.",
    steps: [
      "Hamish adds the client's record in /admin.",
      "Portal access is granted by inviting people by email — an owner, plus any additional team members. There's no public sign-up button; every login is someone Hamish explicitly added.",
      "A maintenance arrangement is set: no ongoing plan, one-off invoicing as work comes up, or a real recurring Stripe subscription at that client's own custom monthly rate.",
      "Every one of these actions — adding the client, inviting members, setting the plan — is written to the activity log automatically.",
    ],
  },
  {
    number: "3",
    title: "Request Handling & Fulfillment",
    summary: "What happens when a client actually asks for something.",
    steps: [
      "A client submits a request through their portal, or emails Hamish directly (checked once a day by an inbox cron).",
      "Claude triages it automatically: category, complexity, priority.",
      "Straightforward and covered by the client's plan? A reply is sent back automatically.",
      "Missing information? The client sees plain-English follow-up questions right in their portal, and can just reply to answer them.",
      "Needs real work? A task is created with a calendar reminder sized to its priority. Once Hamish finishes it, the client is emailed that it's done.",
    ],
  },
  {
    number: "4",
    title: "Client Support",
    summary: "Instant answers without waiting on Hamish.",
    steps: [
      "A client can ask a question straight in their portal.",
      "It's answered instantly by an AI copilot grounded in Hamish's own knowledge base — not a generic chatbot guessing.",
    ],
  },
  {
    number: "5",
    title: "Site Monitoring",
    summary: "Catching a broken client website before they notice.",
    steps: [
      "Every client's website is checked once a day for uptime, an expiring SSL certificate, and broken links.",
      "Trouble triggers an alert straight to Hamish.",
      "A clean bill of health just shows quietly as a summary in the client's own portal — no noise either way.",
    ],
  },
  {
    number: "6",
    title: "Billing",
    summary: "Two paths that coexist on purpose: ad-hoc work, and ongoing maintenance.",
    steps: [
      "One-off work is invoiced by Hamish directly from the client's page; Stripe creates and finalises the invoice and emails the client a payment link.",
      "Ongoing maintenance is billed automatically instead: a Stripe subscription at that client's own custom rate generates and sends an invoice every month without Hamish lifting a finger.",
      "Either way, a Stripe webhook marks the invoice paid the moment it clears, and an overdue one gets an automatic reminder.",
      "Clients can view their invoice history and manage their own card details any time via the Stripe Customer Portal, linked from their billing page.",
    ],
  },
  {
    number: "7",
    title: "Daily Overview & Accountability",
    summary: "The one screen that pulls everything above together for Hamish.",
    steps: [
      "Every morning, /admin's Overview surfaces anything that needs attention: overdue invoices, requests stuck waiting on a client, leads gone quiet, site issues.",
      "A full history of who did what — client added, member invited, subscription started or cancelled, status changed — is kept in the Activity log, so nothing on the admin side happens invisibly.",
    ],
  },
];

export function ProcessSteps() {
  return (
    <Accordion className="rounded-xl border border-border bg-card px-4" multiple>
      {STAGES.map((stage) => (
        <AccordionItem key={stage.number} value={stage.number}>
          <AccordionTrigger className="py-4">
            <span className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">
                {stage.number}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{stage.title}</span>
                <span className="font-normal text-muted-foreground">{stage.summary}</span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="ml-9 list-decimal space-y-1.5 text-muted-foreground marker:text-xs marker:text-muted-foreground/70">
              {stage.steps.map((step, i) => (
                <li key={i} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
