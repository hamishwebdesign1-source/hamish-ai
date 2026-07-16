export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export type AISolution = {
  slug: string;
  name: string;
  audience: string;
  description: string;
  features: string[];
  callout: string;
  demo: ChatMessage[];
};

export const aiSolutions: AISolution[] = [
  {
    slug: "customer-assistant",
    name: "AI Customer Assistant",
    audience: "Restaurants, cafés, retailers",
    description:
      "Answers customer questions instantly, shares menus and opening hours, takes booking enquiries, and collects customer details — 24 hours a day, without anyone picking up the phone.",
    features: [
      "Answers FAQs instantly",
      "Shares menu, opening hours, allergen info",
      "Takes booking & enquiry details",
      "Escalates to a human when it needs to",
    ],
    callout: "Saves hours a week of repetitive phone calls and DMs.",
    demo: [
      { role: "user", text: "Do you have vegan options?" },
      {
        role: "ai",
        text: "Yes — we have several vegan dishes including our roasted vegetable tagine and vegan mezze platter. Would you like me to check availability for a table this evening?",
      },
      { role: "user", text: "Are you open on Mondays?" },
      {
        role: "ai",
        text: "We're open Tuesday to Sunday, 5pm till late — closed Mondays. Want me to hold a table for Tuesday instead?",
      },
    ],
  },
  {
    slug: "receptionist",
    name: "AI Receptionist",
    audience: "Hotels, salons, clinics, gyms",
    description:
      "Handles enquiries and appointment requests around the clock, so no booking is lost to a call that goes to voicemail.",
    features: [
      "Answers enquiries 24/7",
      "Checks and offers real appointment slots",
      "Shares pricing & service info",
      "Captures contact details for follow-up",
    ],
    callout: "Never miss a booking to a call you couldn't answer.",
    demo: [
      { role: "user", text: "Do you have a hair appointment free this Saturday afternoon?" },
      {
        role: "ai",
        text: "Yes, we have a 2:30pm and a 4:00pm slot free on Saturday with Claire. Would either of those work, and can I take your name and number to confirm?",
      },
    ],
  },
  {
    slug: "sales-assistant",
    name: "AI Sales Assistant",
    audience: "Tradespeople, estate agents, professional services",
    description:
      "Responds to enquiries the moment they land, asks the right qualifying questions, and books a consultation — so leads don't go cold waiting for a callback.",
    features: [
      "Instant response to new enquiries",
      "Qualifies the job or lead automatically",
      "Drafts a follow-up message for you to approve",
      "Books a consultation straight into your calendar",
    ],
    callout: "Respond in seconds, not the next day.",
    demo: [
      { role: "user", text: "Hi, I need a quote for a bathroom rewire, how soon can someone come out?" },
      {
        role: "ai",
        text: "Happy to help — a bathroom rewire is usually a half-day job. Is this a full rewire, or just new sockets and lighting? I can get you booked in for a free site visit this week.",
      },
    ],
  },
  {
    slug: "knowledge-assistant",
    name: "AI Business Knowledge Assistant",
    audience: "Any business with staff, policies, or procedures",
    description:
      "A private AI assistant trained on your own documents — staff handbook, FAQs, policies, product specs — so staff and customers get accurate answers without digging through folders or asking a manager.",
    features: [
      "Trained on your own documents",
      "Answers staff onboarding questions instantly",
      "Keeps sensitive data private to your business",
      "Doubles as a customer support assistant",
    ],
    callout: "Your own knowledge base, answering questions instantly.",
    demo: [
      { role: "user", text: "What's our policy on refunds for online orders?" },
      {
        role: "ai",
        text: "Customers can request a refund within 14 days of delivery if the item is unused and in its original packaging — full policy is in section 4.2 of the handbook. Want me to draft a reply to a customer asking about this?",
      },
    ],
  },
  {
    slug: "content-automation",
    name: "AI Content Automation",
    audience: "Any business that needs to market itself but has no time",
    description:
      "AI drafts your social posts, blog articles, email campaigns, and product descriptions from a few bullet points — you review and approve, not write from scratch.",
    features: [
      "Social media post drafts",
      "Blog & email campaign drafts",
      "Product descriptions from a spec sheet",
      "Consistent tone of voice, trained on your brand",
    ],
    callout: "Marketing that keeps up, without the writer's block.",
    demo: [
      { role: "user", text: "We've got fresh oysters in this week, half price Wednesday." },
      {
        role: "ai",
        text: "🦪 Oyster Wednesday is back! Half price on all our fresh oysters this week only — grab a table and make a night of it. See you at the bar. #EdinburghEats #Leith",
      },
    ],
  },
  {
    slug: "analytics-assistant",
    name: "AI Analytics Assistant",
    audience: "Any business with sales or booking data",
    description:
      "Ask plain-English questions about your own business data and get a straight answer — no spreadsheets, no dashboards to learn.",
    features: [
      "Ask questions in plain English",
      "Pulls answers from your own sales/booking data",
      "Flags trends before you'd notice them yourself",
      "No dashboard training required",
    ],
    callout: "Know what's working without opening a spreadsheet.",
    demo: [
      { role: "user", text: "Which products sold best this month?" },
      {
        role: "ai",
        text: "Your top 3 this month: Grilled Cod (142 orders), Fish & Chips (118), Smoked Haddock Chowder (94) — chowder orders are up 30% versus last month, worth featuring it more prominently on the menu.",
      },
    ],
  },
];
