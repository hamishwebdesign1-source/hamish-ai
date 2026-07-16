export const siteConfig = {
  name: "Hamish AI",
  tagline: "Edinburgh's AI transformation partner for small businesses",
  description:
    "We help Edinburgh businesses automate tasks, improve customer experiences, and unlock new growth opportunities using practical AI solutions. We don't just build websites — we make businesses smarter with AI.",
  location: "Edinburgh, Scotland",
  email: "HamishWebDesign1@gmail.com",
  phone: "+44 131 000 0000",
  nav: [
    { label: "AI Solutions", href: "/ai-solutions" },
    { label: "Services", href: "/services" },
    { label: "Portfolio", href: "/portfolio" },
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
