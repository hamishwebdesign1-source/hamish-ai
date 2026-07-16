import {
  UtensilsCrossed,
  ConciergeBell,
  Handshake,
  Dumbbell,
  Calculator,
  MessageSquare,
  CalendarCheck,
  Star,
  Camera,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import type { ChatMessage } from "@/lib/ai-solutions-data";

export type CaseStudyStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export type CaseStudyFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  demo: ChatMessage[];
};

export type CaseStudy = {
  slug: string;
  name: string;
  industry: string;
  overview: string;
  demoUrl: string;
  accentFrom: string;
  accentTo: string;
  challenge: string[];
  solution: string[];
  showcasePages: string[];
  aiFeatures: CaseStudyFeature[];
  stats: CaseStudyStat[];
  testimonial: { quote: string; role: string };
  tech: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "the-gannet",
    name: "The Gannet",
    industry: "Restaurant · Leith",
    overview:
      "A moody, photography-led redesign for a Leith seafood restaurant, built around a booking-first layout and an AI assistant that never lets a hungry customer go unanswered.",
    demoUrl: "/demo/the-gannet",
    accentFrom: "#f59e0b",
    accentTo: "#18181b",
    challenge: [
      "Menu, hours, and allergen questions ate into service time every evening",
      "No online booking meant missed tables whenever the phone went unanswered",
      "The old site looked closed for business — dated design, no mobile layout",
    ],
    solution: [
      "A dark, editorial redesign built around the food and a sticky booking CTA",
      "An AI customer assistant trained on the menu, hours, and allergen info",
      "Automated waitlist SMS so a fully-booked night doesn't mean a lost customer",
    ],
    showcasePages: ["Home", "Menu", "Book a Table", "Our Story", "Contact"],
    aiFeatures: [
      {
        icon: UtensilsCrossed,
        title: "AI Menu & Booking Assistant",
        description:
          "Answers menu and allergen questions instantly, and takes booking enquiries around the clock.",
        demo: [
          { role: "user", text: "Do you have vegan options?" },
          {
            role: "ai",
            text: "Yes — we have several vegan dishes including our roasted vegetable tagine and vegan mezze platter. Would you like me to check availability for a table this evening?",
          },
        ],
      },
      {
        icon: Camera,
        title: "Review Automation",
        description:
          "Sends a friendly follow-up after a booking, prompting happy diners to leave a review while the meal is still fresh in memory.",
        demo: [
          { role: "ai", text: "Thanks for dining with us tonight! Mind leaving a quick review? It really helps a small, independent kitchen like ours." },
          { role: "user", text: "Of course — that was one of the best meals I've had in Leith." },
        ],
      },
    ],
    stats: [
      { label: "Online bookings", value: "+38%", icon: CalendarCheck },
      { label: "Staff hours saved weekly", value: "6 hrs", icon: ClipboardCheck },
      { label: "Assistant response time", value: "24/7", icon: MessageSquare },
      { label: "Average review rating", value: "4.8★", icon: Star },
    ],
    testimonial: {
      quote:
        "We used to lose bookings every time the phone rang during service. Now the site handles it — and somehow still sounds like us.",
      role: "Restaurant owner, Leith",
    },
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Anthropic Claude", "Resend", "Vercel"],
  },
  {
    slug: "craigie-and-sons",
    name: "Craigie & Sons Joinery",
    industry: "Trades · Portobello",
    overview:
      "A trust-first rebuild for a local joinery business, with a before/after project gallery and an AI quote assistant that works from a job site, not just a desk.",
    demoUrl: "/demo/craigie-and-sons",
    accentFrom: "#065f46",
    accentTo: "#ea580c",
    challenge: [
      "Quote requests arrived by phone only, often missed while on a job",
      "No way to prioritise urgent callouts over routine enquiries",
      "The old site had no project gallery, so trust had to be built from scratch every time",
    ],
    solution: [
      "A clean, mobile-first rebuild with a real before/after project gallery",
      "An AI quotation assistant that triages enquiries by job type and urgency",
      "A photo-upload quote form with automatic confirmation and follow-up",
    ],
    showcasePages: ["Home", "Services", "Our Work", "Get a Quote", "Contact"],
    aiFeatures: [
      {
        icon: Handshake,
        title: "AI Quotation Assistant",
        description:
          "Gathers job details and urgency automatically, so emergency callouts get a reply before routine enquiries.",
        demo: [
          { role: "user", text: "Hi, I need a quote for a bathroom rewire, how soon can someone come out?" },
          {
            role: "ai",
            text: "Happy to help — a bathroom rewire is usually a half-day job. Is this a full rewire, or just new sockets and lighting? I can get you booked in for a free site visit this week.",
          },
        ],
      },
      {
        icon: ClipboardCheck,
        title: "Lead Qualification",
        description:
          "Routes each enquiry to the right tradesperson with job type, urgency, and photos attached — no more back-and-forth just to scope the job.",
        demo: [
          { role: "ai", text: "Got it — logged as: Kitchen fitting, standard priority. Photos attached. I've flagged this for Dave to quote by tomorrow." },
        ],
      },
    ],
    stats: [
      { label: "Quote requests", value: "+52%", icon: Handshake },
      { label: "Quote turnaround", value: "Same-day", icon: ClipboardCheck },
      { label: "Admin time saved weekly", value: "3 hrs", icon: MessageSquare },
      { label: "Enquiries auto-triaged", value: "90%", icon: Star },
    ],
    testimonial: {
      quote:
        "I used to scope jobs over three phone calls. Now half the details are already there before I've even called the customer back.",
      role: "Joinery business owner, Portobello",
    },
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Anthropic Claude", "Resend", "Vercel"],
  },
  {
    slug: "assembly-rooms-hotel",
    name: "The Assembly Rooms",
    industry: "Boutique hotel · New Town",
    overview:
      "A direct-booking-first redesign for a Georgian townhouse hotel, built to win business back from OTA commission with a concierge-style AI assistant.",
    demoUrl: "/demo/assembly-rooms-hotel",
    accentFrom: "#5c1f2b",
    accentTo: "#8a7c66",
    challenge: [
      "Almost all bookings came through third-party sites, each taking an 18% commission",
      "Guests emailed simple questions — parking, breakfast times — that staff answered one by one",
      "The old site buried the booking button under generic stock photography",
    ],
    solution: [
      "A refined, direct-booking-first redesign with a clear savings message versus OTAs",
      "An AI concierge that answers guest questions and suggests local recommendations",
      "Booking automation that prompts upsells like late checkout at the right moment",
    ],
    showcasePages: ["Home", "Rooms", "Book Direct", "Local Guide", "Contact"],
    aiFeatures: [
      {
        icon: ConciergeBell,
        title: "AI Concierge",
        description:
          "Answers room and local-area questions instantly, any hour a guest happens to be awake.",
        demo: [
          { role: "user", text: "Anywhere good for dinner nearby that's not touristy?" },
          {
            role: "ai",
            text: "Try Café St Honoré, five minutes' walk — small, French, locals' favourite. Want me to note it for the concierge desk to book?",
          },
        ],
      },
      {
        icon: CalendarCheck,
        title: "Booking Upsell Automation",
        description:
          "Prompts guests toward late checkout and breakfast add-ons at exactly the right moment in their stay.",
        demo: [
          { role: "user", text: "Can I get a late checkout on Sunday?" },
          { role: "ai", text: "1pm checkout is available for £15, or free if you add breakfast for two — shall I add it to your booking?" },
        ],
      },
    ],
    stats: [
      { label: "Direct bookings", value: "+22%", icon: CalendarCheck },
      { label: "Saved vs OTA commission", value: "18%", icon: Star },
      { label: "Guest support availability", value: "24/7", icon: ConciergeBell },
      { label: "Guest satisfaction score", value: "4.9★", icon: Star },
    ],
    testimonial: {
      quote:
        "Every direct booking used to feel like a small win against the OTAs. Now it's the default, not the exception.",
      role: "Hotel owner, New Town",
    },
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Anthropic Claude", "Resend", "Vercel"],
  },
  {
    slug: "forge-fitness",
    name: "Forge Fitness Studio",
    industry: "Fitness studio · Bruntsfield",
    overview:
      "A bold, high-contrast rebuild for a Bruntsfield fitness studio, with the class timetable front and centre and an AI assistant that keeps every class full.",
    demoUrl: "/demo/forge-fitness",
    accentFrom: "#0a0a0a",
    accentTo: "#d4ff00",
    challenge: [
      "Cancelled class spots went unfilled, losing revenue every week",
      "New members didn't know which class to book first and often didn't book at all",
      "The old site had no timetable — just a static PDF nobody checked",
    ],
    solution: [
      "A bold, video-led redesign with the live timetable front and centre",
      "An AI class-recommendation assistant that guides new members to the right first class",
      "Automated waitlist SMS that fills cancelled spots within minutes, not days",
    ],
    showcasePages: ["Home", "Timetable", "Membership", "Trainers", "Join Now"],
    aiFeatures: [
      {
        icon: Dumbbell,
        title: "AI Class Recommendation",
        description:
          "Guides nervous first-timers to the right class and instructor, instead of leaving them to guess.",
        demo: [
          { role: "user", text: "I'm a total beginner, what should I try first?" },
          {
            role: "ai",
            text: "Start with Strength on Monday at 12:15pm — smaller class, coach-led pace, great for building confidence with the equipment. Want me to book you in?",
          },
        ],
      },
      {
        icon: CalendarCheck,
        title: "Waitlist Fill Automation",
        description:
          "Texts the waitlist the moment a spot opens up, so cancellations stop being lost revenue.",
        demo: [
          { role: "user", text: "Can you text me if a spot opens up earlier?" },
          { role: "ai", text: "Done — you're on the waitlist for the 6:30am slot too. We'll text you the moment someone cancels." },
        ],
      },
    ],
    stats: [
      { label: "New member sign-ups", value: "+45%", icon: Dumbbell },
      { label: "Avg. time to refill a cancelled spot", value: "10 min", icon: CalendarCheck },
      { label: "Scheduling time saved weekly", value: "5 hrs", icon: ClipboardCheck },
      { label: "Fewer no-shows", value: "-30%", icon: Star },
    ],
    testimonial: {
      quote:
        "Cancelled spots used to just be lost money. Now they're filled before I've even seen the notification.",
      role: "Studio owner, Bruntsfield",
    },
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Anthropic Claude", "Resend", "Vercel"],
  },
  {
    slug: "lomond-and-grey",
    name: "Lomond & Grey Accountants",
    industry: "Professional services · New Town",
    overview:
      "An understated, credibility-first rebuild for an Edinburgh accountancy practice, with an AI assistant that routes enquiries so billable time goes to the right clients.",
    demoUrl: "/demo/lomond-and-grey",
    accentFrom: "#0f172a",
    accentTo: "#64748b",
    challenge: [
      "Sole trader and limited company enquiries landed in the same generic inbox",
      "Common tax-deadline questions took up hours of partner time each week",
      "The old site read like a brochure — no clear next step for a visitor",
    ],
    solution: [
      "An understated, trust-first redesign organised around client type",
      "An AI FAQ assistant that answers common deadline questions instantly",
      "A lead-qualification form that routes individuals and businesses to the right team",
    ],
    showcasePages: ["Home", "Services", "FAQ", "Get in Touch"],
    aiFeatures: [
      {
        icon: Calculator,
        title: "AI FAQ Assistant",
        description:
          "Answers common tax-deadline questions instantly, so clients aren't waiting on an email the night before it's due.",
        demo: [
          { role: "user", text: "When's the deadline for my self-assessment this year?" },
          {
            role: "ai",
            text: "Online returns are due 31 January, with payment due the same day. Want a reminder set closer to the date, or should I flag this to the team to review your return early?",
          },
        ],
      },
      {
        icon: ClipboardCheck,
        title: "Client Onboarding & Routing",
        description:
          "Qualifies each enquiry by client type and routes it to the right team automatically.",
        demo: [
          { role: "user", text: "I run a limited company too, is that different?" },
          {
            role: "ai",
            text: "Yes — your company's corporation tax and accounts deadlines run separately, based on your year end. I've noted you as a limited company client so the team can confirm your specific dates.",
          },
        ],
      },
    ],
    stats: [
      { label: "Qualified leads", value: "+60%", icon: Handshake },
      { label: "Average response time", value: "1 day", icon: MessageSquare },
      { label: "Partner time saved weekly", value: "4 hrs", icon: ClipboardCheck },
      { label: "Urgent enquiries flagged same-day", value: "100%", icon: Star },
    ],
    testimonial: {
      quote:
        "Enquiries used to all land in one inbox regardless of what they actually needed. Now the right person sees the right question, first time.",
      role: "Partner, Edinburgh accountancy practice",
    },
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Anthropic Claude", "Resend", "Vercel"],
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
