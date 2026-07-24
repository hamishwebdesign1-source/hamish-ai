import {
  UtensilsCrossed,
  Hammer,
  ConciergeBell,
  Dumbbell,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type KpiTrend = "up" | "down";

export type Kpi = {
  id: string;
  label: string;
  value: string;
  trendValue: string;
  trendDirection: KpiTrend;
  isGoodTrend: boolean;
  sparkline: number[];
};

// Fictional, illustrative figures — same "concept demonstration" framing
// used on the case-study StatsGrid, not real client data.
export const dashboardKpis: Kpi[] = [
  {
    id: "revenue",
    label: "Revenue",
    value: "£18,400",
    trendValue: "+12%",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [11, 12, 13, 12, 14, 16, 15, 17, 18.4],
  },
  {
    id: "sales",
    label: "Sales",
    value: "142 orders",
    trendValue: "+8%",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [98, 102, 110, 108, 118, 124, 130, 136, 142],
  },
  {
    id: "leads",
    label: "Leads",
    value: "63 new leads",
    trendValue: "+21%",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [34, 38, 41, 40, 47, 52, 55, 58, 63],
  },
  {
    id: "bookings",
    label: "Bookings",
    value: "89 bookings",
    trendValue: "+15%",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [58, 61, 65, 63, 70, 75, 79, 84, 89],
  },
  {
    id: "csat",
    label: "Customer satisfaction",
    value: "4.8★",
    trendValue: "+0.2",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [4.3, 4.4, 4.4, 4.5, 4.6, 4.6, 4.7, 4.7, 4.8],
  },
  {
    id: "conversion",
    label: "Conversion rate",
    value: "24%",
    trendValue: "+3pts",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [17, 18, 19, 19, 20, 21, 22, 23, 24],
  },
  {
    id: "traffic",
    label: "Website traffic",
    value: "3,240 visits",
    trendValue: "+18%",
    trendDirection: "up",
    isGoodTrend: true,
    sparkline: [2200, 2350, 2400, 2500, 2650, 2800, 2950, 3100, 3240],
  },
  {
    id: "response-time",
    label: "Response time",
    value: "42 sec avg",
    trendValue: "-18%",
    trendDirection: "down",
    isGoodTrend: true,
    sparkline: [72, 68, 65, 61, 58, 54, 50, 46, 42],
  },
];

export const trafficByDay = {
  label: "Website traffic this week",
  data: [
    { day: "Mon", value: 420 },
    { day: "Tue", value: 380 },
    { day: "Wed", value: 510 },
    { day: "Thu", value: 490 },
    { day: "Fri", value: 560 },
    { day: "Sat", value: 610 },
    { day: "Sun", value: 270 },
  ],
};

export type AiInsight = { id: string; text: string };

// Rotates through the "Regenerate insights" button on the dashboard demo —
// illustrative examples of the kind of plain-English pattern an AI
// analytics layer would surface, not figures from a real business.
export const aiInsights: AiInsight[] = [
  {
    id: "monday-spike",
    text: "Customer enquiries increase by 30% on Monday mornings — worth adding cover for that window.",
  },
  {
    id: "evening-drop",
    text: "Bookings decline sharply after 6pm — a follow-up prompt at 5pm could recover some of that drop-off.",
  },
  {
    id: "returning-spend",
    text: "Returning customers spend 24% more than new customers — a simple loyalty nudge could pay for itself.",
  },
  {
    id: "response-improved",
    text: "Average response time has improved by 18% since AI took over first-line enquiries.",
  },
  {
    id: "mobile-traffic",
    text: "Mobile website traffic is up 22% this month — worth double-checking the mobile booking flow.",
  },
  {
    id: "fast-reply-converts",
    text: "Conversion is highest on enquiries answered within 5 minutes — speed matters more than message length.",
  },
];

export type AnalyticsIndustry = {
  slug: string;
  name: string;
  icon: LucideIcon;
  points: string[];
};

// Deliberately mapped onto the 5 real case-study businesses already on the
// site, rather than inventing industries (dentist, estate agent, retail)
// with no case study to back them up.
export const analyticsIndustries: AnalyticsIndustry[] = [
  {
    slug: "the-gannet",
    name: "Restaurants & cafés",
    icon: UtensilsCrossed,
    points: ["Booking trends by day and time", "Which menu items actually drive revenue", "Busiest periods, staffed accordingly"],
  },
  {
    slug: "craigie-and-sons",
    name: "Trades",
    icon: Hammer,
    points: ["Quote-to-job conversion rate", "Which job types are most profitable", "Callout response times"],
  },
  {
    slug: "assembly-rooms-hotel",
    name: "Hotels & hospitality",
    icon: ConciergeBell,
    points: ["Occupancy and seasonal demand", "Revenue per room by season", "Guest satisfaction trends"],
  },
  {
    slug: "forge-fitness",
    name: "Gyms & fitness studios",
    icon: Dumbbell,
    points: ["Membership growth and churn", "Class attendance patterns", "Retention by membership type"],
  },
  {
    slug: "lomond-and-grey",
    name: "Professional services",
    icon: Briefcase,
    points: ["Client retention by service line", "Enquiry-to-client conversion", "Which services are most profitable"],
  },
];

export type AnalyticsFaq = { question: string; answer: string };

export const analyticsFaqs: AnalyticsFaq[] = [
  {
    question: "Do I need existing software or a big data set for this to work?",
    answer:
      "No — most small businesses already generate more data than they realise: booking systems, point-of-sale, spreadsheets, even an AI chatbot's own conversation logs. We work with what you already have rather than asking you to adopt something new first.",
  },
  {
    question: "Do you use Power BI, or something custom?",
    answer:
      "Either — Power BI is genuinely one of the tools in the kit, alongside custom-built dashboards where that fits better. Which one we use depends on your existing setup, not a fixed template.",
  },
  {
    question: "How is this different from the AI Analytics Assistant chatbot?",
    answer:
      "The AI Analytics Assistant (one of our six AI Solutions) is a conversational layer — ask a plain-English question, get an answer. AI Business Analytics is the fuller picture: dashboards, automated reports, and a process review of how your business actually runs — the chatbot can be one part of that, not the whole of it.",
  },
  {
    question: "Is this only for businesses with a dedicated data team?",
    answer:
      "The opposite — this exists specifically because small businesses don't have one. That's also where my own background as a business analyst matters: understanding the process comes before recommending any dashboard.",
  },
  {
    question: "What does this cost?",
    answer:
      "Founding client pricing starts from £995 — see the Services page for the full breakdown alongside our other packages.",
  },
];
