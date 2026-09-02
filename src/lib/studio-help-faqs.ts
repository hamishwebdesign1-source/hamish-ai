// Extracted from help/page.tsx (previously a local const there) so the
// Studio AI Assistant (answer-studio-question.ts) can ground "how do I…"
// product questions in the exact same real, maintained FAQ content the
// Help page shows — rather than either duplicating it or leaving the
// assistant unable to answer anything the Help page already covers. This
// is fixed platform documentation about the Agency Platform itself (same
// for every tenant), unlike the portal's knowledge_base-backed FAQ
// (tenant-authored facts about their own business) — see help/page.tsx's
// own comment on that distinction.
export type StudioFaq = { q: string; a: string };

export const STUDIO_FAQS: StudioFaq[] = [
  // --- Prospecting & sales ---
  {
    q: "How does prospecting work?",
    a: "Set your ideal client (categories and areas) in Prospects, then run a discovery search. The AI finds real businesses matching your criteria, researches each one, and scores it on fit, need, value, and confidence — no fabricated numbers, every score is explained.",
  },
  {
    q: "What are Campaigns, and do I need them?",
    a: "A campaign is an optional way to group prospects under one outreach push (e.g. a specific area or industry drive) so you can see contact and reply rates for that group specifically, not just your whole pipeline. Prospects work exactly the same with or without a campaign attached.",
  },
  {
    q: "What's a sales kit?",
    a: "One AI call that generates everything you need to reach out to a prospect at once — an outreach email, a follow-up email, a call script, a LinkedIn message, a meeting agenda, and a proposal outline — all grounded in the real research already done on that business, never generic filler.",
  },
  {
    q: "Can I send an actual proposal to a prospect?",
    a: "Yes — once a prospect has a sales kit, use Send proposal from Prospects. It emails them a branded PDF and a link to a public page where they can view and accept it with no account needed. You'll see Sent, Viewed, and Accepted status right there on the prospect, and get notified the moment they accept.",
  },
  {
    q: "What's the rate card in Settings for?",
    a: "Your own real pricing for your own services — set it once, and it's what shows up in the pricing section of every proposal PDF you send from Prospects. Leave it blank and proposals simply won't include a pricing section, never a guessed number.",
  },
  {
    q: "What's autonomous outreach?",
    a: "An opt-in setting (Settings > Prospecting) that automates exactly one step of your own outreach cadence: a follow-up email sent 7 days after a call with no reply, using content you've already reviewed in that prospect's sales kit. Nothing else is ever sent without you clicking send yourself.",
  },
  {
    q: "What's competitive intel, and where does it come from?",
    a: "An opt-in monthly check (Settings) that researches your existing clients' real competitors and surfaces genuinely current findings as a retention talking point — never a vague or invented claim. It only ever runs against clients you already have, not prospects.",
  },
  // --- Converting & running clients ---
  {
    q: "What happens when I convert a prospect to a client?",
    a: "It creates a client record, a portal login for them at hamishai.org/portal (branded to your agency), a real \"Onboarding\" project with a 14-day target, and — if you've set a reply-to email in Settings — a welcome email with their portal link. Nothing is billed or invoiced automatically; that's a separate step from Clients once you're ready.",
  },
  {
    q: "How do I invoice a client?",
    a: "Connect your own Stripe account first (Settings > Client billing) — this is what lets your clients pay you directly, HamishAI never holds that money. Once connected, open a client in Clients and create an invoice; it's sent through Stripe with a real payment link. You can also set a recurring monthly rate and start a real subscription — editing that rate later updates the live Stripe subscription too, not just what Studio shows you.",
  },
  {
    q: "Why can't I invoice yet?",
    a: "Stripe Connect needs your own account signed up for Connect (a one-time setup on Stripe's side, not something we can do for you) and verified before charges can flow to it. Check Settings for your current status.",
  },
  {
    q: "What's a project, and do I have to use it?",
    a: "A project is an optional way to group a client's tasks under one deliverable with a target date, so you can see what's owed and by when. Tasks work exactly the same with or without a project attached — it's there when you want the extra structure, not required.",
  },
  {
    q: "How do monthly reports work?",
    a: "On the 1st of each month, a snapshot report is generated for every active client — health score, requests handled, tasks completed, spend, uptime — and stored permanently (it won't change later, unlike the live Insights numbers). You can also generate a client's first report early from their card in Clients, and it's emailed with a real PDF attached.",
  },
  {
    q: "Can my client's own contact see this dashboard, or add another person to their portal?",
    a: "Their portal (hamishai.org/portal) is completely separate from Studio — they see their own project updates, requests, and invoices, not your other clients or pipeline. You can add or remove who has portal access to a client directly from that client's own card in Clients, without emailing us to do it.",
  },
  // --- Team & billing ---
  {
    q: "Can I add other people to my team?",
    a: "Yes, from Settings — invite by email and they'll get access to your whole workspace. Starter and Professional plans include 1 seat; Agency includes multiple. Whoever you invite gets full access to your own team's work, but only the workspace owner can do genuinely destructive or billing things (requesting account deletion, changing your subscription, deleting a client's data).",
  },
  {
    q: "Can I assign a request, prospect, project, or website build to someone on my team?",
    a: "Yes — once you have more than one person on your team, every request, prospect, project, and Website Builder project gets an \"Assign\" dropdown, plus an \"Assigned to me\" filter on each of those pages. Whoever it's assigned to gets a real notification email.",
  },
  {
    q: "What are usage limits, and what happens if I hit one?",
    a: "Every real AI action (prospect research, sales kits, website mockups, ICP building, request triage, website briefs and build phases, troubleshooting, knowledge base document import) is capped per calendar month based on your plan. If you hit a limit, that action is blocked with a clear message until next month or a plan upgrade — never a silent failure or surprise bill.",
  },
  {
    q: "What happens when my free trial ends?",
    a: "You'll get an email reminder 3 days before it ends, and again the day before. Without a card on file by the end of the 7-day trial, you'll lose access to prospecting until you subscribe from Studio > Billing — your data isn't deleted, just paused.",
  },
  // --- Knowledge base & the embedded chatbot ---
  {
    q: "What's the Knowledge Base for?",
    a: "It's what both your client portal's AI Copilot and the embeddable chatbot (below) answer questions from — facts about your clients' own businesses (hours, pricing, policies, FAQs). Add entries by hand, or upload a document and let AI split it into entries for you to review before anything's saved.",
  },
  {
    q: "Can I put a chatbot on my client's own website?",
    a: "Yes — turn it on from that client's card in Clients, once they have at least a few Knowledge Base entries. It's a real embeddable widget answering strictly from those facts (never inventing account or order details), and if a visitor asks something it can't answer, it offers to take their email and message as a real lead — you'll see it on that client's card and get notified.",
  },
  // --- Data, privacy & support ---
  {
    q: "Can I export or delete my organisation's data?",
    a: "Yes — both are in Settings under Data & Privacy. Export downloads everything held about your organisation as a file. Full account deletion is a request (not instant, since it also cancels billing and any connected Stripe relationship) — we'll follow up directly once you ask.",
  },
  {
    q: "Something's not working — what do I do?",
    a: "Email hello@hamishai.org with what you were doing and what happened. Real application errors are monitored, so many issues are already visible to us before you even report them — but a report with specifics always helps us fix it faster.",
  },
];
