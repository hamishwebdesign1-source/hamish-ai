import { HelpCircle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Studio-side help (P1 platform readiness item) — the client portal has
// had a Help/FAQ page since Week 3; Studio, the agency owner's own side,
// had none. Unlike the portal's knowledge_base-backed FAQ (tenant-authored
// content about their own business, answered per-client), this is fixed
// platform documentation about how to use the Agency Platform itself —
// the same for every tenant, so static content here is correct, not a
// missing feature to build a CMS for.
const faqs = [
  {
    q: "How does prospecting work?",
    a: "Set your ideal client (categories and areas) in Prospects, then run a discovery search. The AI finds real businesses matching your criteria, researches each one, and scores it on fit, need, value, and confidence — no fabricated numbers, every score is explained.",
  },
  {
    q: "What happens when I convert a prospect to a client?",
    a: "It creates a client record and a portal login for them at hamishai.org/portal, branded to your agency. Nothing is billed or invoiced automatically — that's a separate step from Clients once you're ready.",
  },
  {
    q: "How do I invoice a client?",
    a: "Connect your own Stripe account first (Settings > Client billing) — this is what lets your clients pay you directly, HamishAI never holds that money. Once connected, open a client in Clients and create an invoice; it's sent through Stripe with a real payment link.",
  },
  {
    q: "Why can't I invoice yet?",
    a: "Stripe Connect needs your own account signed up for Connect (a one-time setup on Stripe's side, not something we can do for you) and verified before charges can flow to it. Check Settings for your current status.",
  },
  {
    q: "What are usage limits, and what happens if I hit one?",
    a: "Every AI action (discovery, research, sales kits, website mockups, request triage) is capped per calendar month based on your plan. If you hit a limit, that action is blocked with a clear message until next month or a plan upgrade — never a silent failure or surprise bill.",
  },
  {
    q: "What's a project, and do I have to use it?",
    a: "A project is an optional way to group a client's tasks under one deliverable with a target date, so you can see what's owed and by when. Tasks work exactly the same with or without a project attached — it's there when you want the extra structure, not required.",
  },
  {
    q: "How do monthly reports work?",
    a: "On the 1st of each month, a snapshot report is generated for every active client — health score, requests handled, tasks completed, spend, uptime — and stored permanently (it won't change later, unlike the live Insights numbers). You can also generate a client's first report early from their card in Clients.",
  },
  {
    q: "What happens when my free trial ends?",
    a: "You'll get an email reminder with a week left and again the day before. Without a card on file by the end of the 14-day trial, you'll lose access to prospecting until you subscribe from Studio > Billing — your data isn't deleted, just paused.",
  },
  {
    q: "Can I export or delete my organisation's data?",
    a: "Yes — both are in Settings under Data & Privacy. Export downloads everything held about your organisation as a file. Full account deletion is a request (not instant, since it also cancels billing and any connected Stripe relationship) — we'll follow up directly once you ask.",
  },
  {
    q: "Something's not working — what do I do?",
    a: "Email hello@hamishai.org with what you were doing and what happened. Real application errors are monitored, so many issues are already visible to us before you even report them — but a report with specifics always helps us fix it faster.",
  },
];

export default function StudioHelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Help</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Common questions about running your agency on this platform. Something else? Email{" "}
        <a href="mailto:hello@hamishai.org" className="text-accent underline underline-offset-2">
          hello@hamishai.org
        </a>
        .
      </p>

      <div className="mt-8">
        <Accordion>
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-sm font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <HelpCircle className="size-4 shrink-0" />
        Nothing here covers it? Email us — real questions become real FAQ entries.
      </div>
    </div>
  );
}
