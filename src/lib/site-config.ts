export const siteConfig = {
  name: "Hamish AI",
  // Updated 2 Sep 2026, alongside layout.tsx's own metadata — the Agency
  // Platform is now the homepage/growth focus (see (site)/page.tsx's own
  // comment), so this and `description` below now lead with that rather
  // than the Edinburgh consultancy pitch, which is still real (still
  // reachable at /agency, still what `location`/`email`/`phone` below
  // genuinely belong to) but no longer the primary framing.
  tagline: "Infrastructure for AI agencies — built running a real one in Edinburgh.",
  // Kept in sync with layout.tsx's <meta name="description"> — now
  // read by organization-json-ld.tsx's sitewide Organization schema, so
  // drift here is no longer just a stale unused field, it's a real,
  // visible-to-search-engines inconsistency if the two disagree.
  description:
    "The platform behind HamishAI, now yours to run your own agency on. Prospecting, AI analysis, outreach and client delivery, in one workspace.",
  location: "Edinburgh, Scotland",
  email: "HamishWebDesign1@gmail.com",
  phone: "07949 674994",
  linkedin: "https://www.linkedin.com/in/hamish-mcfarlane-38a4881b2/",
  nav: [
    { label: "AI Solutions", href: "/ai-solutions" },
    { label: "Analytics", href: "/analytics" },
    { label: "Services", href: "/services" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
};

export type Package = {
  name: string;
  foundingPrice: string;
  standardPrice: string;
  tagline: string;
  timeline: string;
  features: string[];
  highlighted?: boolean;
};

export const foundingOfferNote =
  "Founding client pricing — available to the first 5 Edinburgh businesses we work with. Prices return to standard rate after that.";

export const packages: Package[] = [
  {
    name: "AI Website Transformation",
    foundingPrice: "From £595",
    standardPrice: "£1,500 – £3,000 standard price",
    tagline: "A modern, AI-ready website that finally works for you.",
    timeline: "1–2 weeks",
    features: [
      "Full website redesign, mobile-first",
      "AI chatbot trained on your business — like the one on this site",
      "On-page SEO + Google Business Profile optimisation",
      "Analytics so you know what's actually working",
    ],
  },
  {
    name: "AI Business Automation",
    foundingPrice: "From £1,200",
    standardPrice: "£3,000 – £7,500 standard price",
    tagline: "Automate the admin that's eating your evenings.",
    timeline: "2–4 weeks",
    features: [
      "Everything in AI Website Transformation",
      "AI receptionist or sales assistant tuned to your business",
      "Booking, enquiry, and lead-qualification automation",
      "CRM / calendar integration",
    ],
    highlighted: true,
  },
  {
    name: "AI Growth Partnership",
    foundingPrice: "From £99/month",
    standardPrice: "£249 – £499/month standard rate",
    tagline: "Ongoing AI optimisation, content, and growth — one monthly fee.",
    timeline: "Ongoing, cancel anytime",
    features: [
      "AI content automation — social, email, and blog drafts",
      "Monthly performance report with AI-driven recommendations",
      "Chatbot tuning and knowledge-base updates",
      "Priority support",
    ],
  },
];

// A fourth pillar, kept deliberately separate from `packages` above rather
// than a 4th array entry — the 3-package grid and comparison table on the
// Services page map over `packages` directly, and both are hardcoded to 3
// columns. Adding a 4th entry there would silently reflow/break both.
export const analyticsPackage: Package = {
  name: "AI Business Analytics",
  foundingPrice: "From £995",
  standardPrice: "£2,000 – £4,500 standard price",
  tagline: "Turn your business data into decisions, automatically.",
  timeline: "2–4 weeks",
  features: [
    "Executive dashboards built around your real KPIs",
    "Automated AI reports — no spreadsheet required",
    "Customer, sales, and marketing analytics",
    "Process review from a Technology Business Analyst background",
  ],
};
