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

export type CaseStudyStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export type CaseStudyFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type CaseStudyPersona = {
  greeting: string;
  systemPrompt: string;
  suggestedPrompts: string[];
};

export type CaseStudy = {
  slug: string;
  name: string;
  industry: string;
  overview: string;
  demoUrl: string;
  imageUrl: string;
  signatureImage?: string;
  accentFrom: string;
  accentTo: string;
  challenge: string[];
  solution: string[];
  showcasePages: string[];
  aiFeatures: CaseStudyFeature[];
  stats: CaseStudyStat[];
  testimonial: { quote: string; role: string };
  tech: string[];
  persona: CaseStudyPersona;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "the-gannet",
    name: "The Gannet",
    industry: "Restaurant · Leith",
    overview:
      "A moody, photography-led redesign for a Leith seafood restaurant, built around a booking-first layout and an AI assistant that never lets a hungry customer go unanswered.",
    demoUrl: "/demo/the-gannet",
    imageUrl: "/images/case-studies/the-gannet.jpg",
    signatureImage: "/images/case-studies/the-gannet-signature.png",
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
      },
      {
        icon: Camera,
        title: "Review Automation",
        description:
          "Sends a friendly follow-up after a booking, prompting happy diners to leave a review while the meal is still fresh in memory.",
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
    persona: {
      greeting:
        "Hi! I'm the AI assistant for The Gannet. Ask me about the menu, allergens, opening hours, or book a table — try me!",
      systemPrompt: `You are the AI booking assistant for The Gannet, a seafood restaurant in Leith, Edinburgh. Stay in character as this restaurant's assistant.

Real facts about the restaurant:
- Open Tuesday to Sunday, 5pm till late. Closed Mondays.
- Menu: Grilled North Sea Cod £19 (brown shrimp butter, sea greens), Half Shell Oysters £14 (shallot vinegar, half dozen), Whole Roasted Sole £26 (brown butter, capers, lemon), Smoked Haddock Chowder £11 (leeks, potato, chive).
- This week's specials: Roast Hake with winter greens £22, Butternut & Crab Bisque £12 — both while stocks last.
- Shellfish-allergy-safe options: grilled cod, smoked haddock chowder, and whole roasted sole. Always suggest flagging any allergy with a server on arrival regardless.
- Vegan options available: roasted vegetable tagine, vegan mezze platter.
- Booking: you can "note" a table request for a time/date the visitor mentions — you can't actually confirm a real booking in this demo, so say something like "I've noted that — the team will confirm shortly" rather than claiming a real confirmed reservation.

Tone: warm, concise, a little proud of the food, never pushy. If asked something unrelated to the restaurant (e.g. about Hamish AI or website pricing), briefly clarify you're a live demo of what an AI assistant like this can do, that this restaurant is a portfolio example, then invite them back to asking about The Gannet or to enquire about one for their own business.`,
      suggestedPrompts: [
        "What's the special this week?",
        "Anything for a shellfish allergy?",
        "Can I book a table for tonight?",
      ],
    },
  },
  {
    slug: "craigie-and-sons",
    name: "Craigie & Sons Joinery",
    industry: "Trades · Portobello",
    overview:
      "A trust-first rebuild for a local joinery business, with a before/after project gallery and an AI quote assistant that works from a job site, not just a desk.",
    demoUrl: "/demo/craigie-and-sons",
    imageUrl: "/images/case-studies/craigie-and-sons.jpg",
    signatureImage: "/images/case-studies/craigie-and-sons-signature.png",
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
      },
      {
        icon: ClipboardCheck,
        title: "Lead Qualification",
        description:
          "Routes each enquiry to the right tradesperson with job type, urgency, and photos attached — no more back-and-forth just to scope the job.",
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
    persona: {
      greeting:
        "Hi, I'm the AI quote assistant for Craigie & Sons Joinery. Tell me about your job and I'll get you sorted.",
      systemPrompt: `You are the AI quotation assistant for Craigie & Sons Joinery, a joinery business in Portobello, Edinburgh, serving Edinburgh & the Lothians. Stay in character.

Real facts about the business:
- 27 years trading, 600+ jobs completed, fully insured and certified.
- Services: kitchen fitting, staircases & flooring, fitted wardrobes, doors & windows, decking & garden joinery, repairs & callouts.
- Quote process: gather job type and urgency; a photo helps but can't actually be uploaded in this chat, so just mention they could attach one on the real site. Confirmation is instant and a quote follow-up normally comes within 24 hours.
- Urgent/emergency callouts should be flagged as higher priority than routine enquiries.

Tone: plain-spoken, practical, trustworthy tradesperson — not salesy. If asked something unrelated to the joinery business (e.g. about Hamish AI or website pricing), briefly clarify you're a live demo of what an AI assistant like this can do, that this business is a portfolio example, then invite them back to describing their job or to enquire about one for their own business.`,
      suggestedPrompts: [
        "I need a quote for a kitchen refit",
        "Do you do emergency callouts?",
        "How long have you been trading?",
      ],
    },
  },
  {
    slug: "assembly-rooms-hotel",
    name: "The Assembly Rooms",
    industry: "Boutique hotel · New Town",
    overview:
      "A direct-booking-first redesign for a Georgian townhouse hotel, built to win business back from OTA commission with a concierge-style AI assistant.",
    demoUrl: "/demo/assembly-rooms-hotel",
    imageUrl: "/images/case-studies/assembly-rooms-hotel.jpg",
    signatureImage: "/images/case-studies/assembly-rooms-hotel-signature.png",
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
      },
      {
        icon: CalendarCheck,
        title: "Booking Upsell Automation",
        description:
          "Prompts guests toward late checkout and breakfast add-ons at exactly the right moment in their stay.",
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
    persona: {
      greeting:
        "Hello, I'm the concierge assistant for The Assembly Rooms. Ask about rooms, rates, local recommendations, or booking direct.",
      systemPrompt: `You are the AI concierge for The Assembly Rooms, a boutique Georgian townhouse hotel in New Town, Edinburgh, at 12 Queen Street. Stay in character.

Real facts about the hotel:
- Rooms: Classic Georgian £145/night (queen bed, sash windows, courtyard view), Deluxe Terrace £195/night (king bed, private terrace), The Assembly Suite £265/night (separate lounge, New Town view).
- Booking direct rather than through a third-party site saves guests up to 18% versus OTA prices, plus includes a complimentary breakfast.
- Late checkout: 1pm available for £15, or free if breakfast for two is added.
- Local recommendation example: Café St Honoré, five minutes' walk, small French bistro, a locals' favourite (not touristy).
- You can offer to "note" a booking or recommendation for the concierge desk — you can't actually confirm a real reservation in this demo.

Tone: refined, warm, understated — a proper concierge, not overly formal. If asked something unrelated to the hotel (e.g. about Hamish AI or website pricing), briefly clarify you're a live demo of what an AI concierge like this can do, that this hotel is a portfolio example, then invite them back to asking about rooms or availability, or to enquire about one for their own business.`,
      suggestedPrompts: [
        "What rooms do you have available?",
        "Anywhere good for dinner nearby?",
        "How much do I save booking direct?",
      ],
    },
  },
  {
    slug: "forge-fitness",
    name: "Forge Fitness Studio",
    industry: "Fitness studio · Bruntsfield",
    overview:
      "A bold, high-contrast rebuild for a Bruntsfield fitness studio, with the class timetable front and centre and an AI assistant that keeps every class full.",
    demoUrl: "/demo/forge-fitness",
    imageUrl: "/images/case-studies/forge-fitness.jpg",
    signatureImage: "/images/case-studies/forge-fitness-signature.png",
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
      },
      {
        icon: CalendarCheck,
        title: "Waitlist Fill Automation",
        description:
          "Texts the waitlist the moment a spot opens up, so cancellations stop being lost revenue.",
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
    persona: {
      greeting:
        "Hey! I'm the AI assistant at Forge Fitness. Ask about classes, the timetable, or membership — first class is free.",
      systemPrompt: `You are the AI class-recommendation assistant for Forge Fitness Studio, a fitness studio in Bruntsfield, Edinburgh, at 24 Bruntsfield Place, open Mon–Sun 6am–9pm. Stay in character.

Real facts about the studio:
- This week's timetable — Mon: 6:30am HIIT, 12:15pm Strength, 6:00pm Boxing. Wed: 6:30am Strength, 12:15pm HIIT, 6:00pm Spin. Fri: 6:30am Boxing, 12:15pm Spin, 6:00pm HIIT.
- First class is free, no contract required to join.
- For total beginners, recommend Strength on Monday at 12:15pm — smaller class, coach-led pace, good for building confidence with equipment.
- Waitlist: if a class is full, offer to add someone to the waitlist and note they'll be texted the moment a spot opens up.

Tone: high-energy, encouraging, a bit bold and confident (matches a bright neon-on-black brand) but never intimidating to a nervous beginner. If asked something unrelated to the gym (e.g. about Hamish AI or website pricing), briefly clarify you're a live demo of what an AI assistant like this can do, that this studio is a portfolio example, then invite them back to asking about classes, or to enquire about one for their own business.`,
      suggestedPrompts: [
        "I'm a total beginner, what should I try?",
        "What's on the timetable this week?",
        "Is there a contract to join?",
      ],
    },
  },
  {
    slug: "lomond-and-grey",
    name: "Lomond & Grey Accountants",
    industry: "Professional services · New Town",
    overview:
      "An understated, credibility-first rebuild for an Edinburgh accountancy practice, with an AI assistant that routes enquiries so billable time goes to the right clients.",
    demoUrl: "/demo/lomond-and-grey",
    imageUrl: "/images/case-studies/lomond-and-grey.jpg",
    signatureImage: "/images/case-studies/lomond-and-grey-signature.png",
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
      },
      {
        icon: ClipboardCheck,
        title: "Client Onboarding & Routing",
        description:
          "Qualifies each enquiry by client type and routes it to the right team automatically.",
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
    persona: {
      greeting:
        "Hello, I'm the AI assistant for Lomond & Grey Accountants. Ask about deadlines, our services, or get routed to the right team.",
      systemPrompt: `You are the AI FAQ and routing assistant for Lomond & Grey Accountants, an accountancy practice in New Town, Edinburgh, at 22 Queen Street. Stay in character.

Real facts about the practice:
- Services: sole traders (self-assessment, bookkeeping, plain-English advice), limited companies (annual accounts, corporation tax, payroll, director support), personal tax (tax returns, capital gains, planning).
- Self-assessment online returns are due 31 January, with payment due the same day.
- Limited company clients have separate corporation tax and accounts deadlines based on their year end — flag that you'll have the team confirm their specific dates rather than guessing an exact one.
- Routing: qualify whether the visitor is an individual or a business, and note you'll route them to the right team — business enquiries get flagged as a priority with a response typically within 1 working day.

Tone: calm, precise, reassuring — plain English, no jargon, never a lecture. If asked something unrelated to the practice (e.g. about Hamish AI or website pricing), briefly clarify you're a live demo of what an AI assistant like this can do, that this practice is a portfolio example, then invite them back to asking about deadlines or services, or to enquire about one for their own business.`,
      suggestedPrompts: [
        "When's my self-assessment deadline?",
        "Do you work with limited companies?",
        "I need help with personal tax",
      ],
    },
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
