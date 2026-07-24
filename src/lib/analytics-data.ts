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

export type InsightSeverity = "info" | "warning" | "success";

export type AiInsight = {
  id: string;
  emoji: string;
  text: string;
  severity: InsightSeverity;
  confidence: number;
  recommendation: string;
};

// Rotates through the Command Centre's living insight feed — illustrative
// examples of the kind of plain-English pattern an AI analytics layer would
// surface, not figures from a real business.
export const aiInsights: AiInsight[] = [
  {
    id: "revenue-up",
    emoji: "📈",
    text: "Revenue increased 16% compared to last month.",
    severity: "success",
    confidence: 92,
    recommendation: "Consider reinvesting part of this into your best-performing channel.",
  },
  {
    id: "ai-resolved",
    emoji: "🤖",
    text: "AI resolved 81% of customer queries without human input.",
    severity: "success",
    confidence: 95,
    recommendation: "Review the 19% that escalated to find the next automation opportunity.",
  },
  {
    id: "response-warning",
    emoji: "⚠️",
    text: "Customer response time increased yesterday.",
    severity: "warning",
    confidence: 88,
    recommendation: "Check staffing cover for yesterday's shift pattern.",
  },
  {
    id: "friday-evening",
    emoji: "💡",
    text: "Friday evenings are your highest-converting period.",
    severity: "info",
    confidence: 90,
    recommendation: "Consider a limited Friday-evening promotion to capture more of this demand.",
  },
  {
    id: "returning-spend",
    emoji: "⭐",
    text: "Returning customers spend 42% more than new customers.",
    severity: "success",
    confidence: 93,
    recommendation: "A simple loyalty nudge could pay for itself quickly.",
  },
  {
    id: "local-demand",
    emoji: "🔥",
    text: "Local demand is increasing in your area.",
    severity: "info",
    confidence: 81,
    recommendation: "Now is a good time to increase visibility with local search and social.",
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

// --- AI Command Centre data ---
// Everything below feeds the redesigned interactive dashboard component.
// Same "illustrative, not real client data" framing as everything above.

export type HealthScore = { score: number; verdict: string };

export const healthScore: HealthScore = {
  score: 87,
  verdict: "Your business is performing well this week.",
};

export type Momentum = {
  id: string;
  label: string;
  score: number;
  trendValue: string;
  sparkline: number[];
};

export const momentumMetrics: Momentum[] = [
  {
    id: "momentum",
    label: "Business Momentum",
    score: 84,
    trendValue: "+6",
    sparkline: [68, 71, 70, 74, 77, 79, 81, 83, 84],
  },
  {
    id: "revenue-trend",
    label: "Revenue Trend",
    score: 91,
    trendValue: "+12%",
    sparkline: [72, 75, 76, 79, 82, 85, 87, 89, 91],
  },
  {
    id: "lead-quality",
    label: "Lead Quality",
    score: 78,
    trendValue: "+9",
    sparkline: [60, 63, 62, 66, 69, 71, 73, 76, 78],
  },
  {
    id: "csat",
    label: "Customer Satisfaction",
    score: 96,
    trendValue: "+4",
    sparkline: [88, 89, 90, 91, 92, 93, 94, 95, 96],
  },
  {
    id: "efficiency",
    label: "Operational Efficiency",
    score: 82,
    trendValue: "+11%",
    sparkline: [64, 67, 69, 71, 73, 76, 78, 80, 82],
  },
  {
    id: "growth-prediction",
    label: "Growth Prediction",
    score: 88,
    trendValue: "+7%",
    sparkline: [70, 73, 75, 77, 79, 82, 84, 86, 88],
  },
];

export const executiveBriefing =
  "Your business is performing well this week. Bookings increased 11%, and response times improved by 18%. Most new customers arrived via Google Search. However, appointment cancellations have risen on Mondays — we recommend introducing automated reminders to bring that back down.";

export type Forecast = {
  horizon: string;
  projected: string;
  confidenceRange: string;
  path: number[];
};

export const forecast: Forecast = {
  horizon: "Next 30 days",
  projected: "£21,200",
  confidenceRange: "±8% (82% confidence)",
  path: [18.4, 18.9, 19.6, 20.1, 20.6, 21.2],
};

export type Lever = {
  id: string;
  label: string;
  description: string;
  effect: { revenue: number; leads: number; bookings: number };
};

// Illustrative multipliers only — a simple client-side "what if" model, not
// a live forecast. Labelled as such wherever it's shown.
export const whatIfLevers: Lever[] = [
  {
    id: "marketing",
    label: "Marketing spend +20%",
    description: "Increase paid and social spend by a fifth",
    effect: { revenue: 0.09, leads: 0.22, bookings: 0.07 },
  },
  {
    id: "hours",
    label: "Extend opening hours",
    description: "Add weekday evening hours",
    effect: { revenue: 0.06, leads: 0.04, bookings: 0.1 },
  },
  {
    id: "staffing",
    label: "+1 staff member",
    description: "Add one extra pair of hands",
    effect: { revenue: 0.05, leads: 0.02, bookings: 0.08 },
  },
  {
    id: "chatbot",
    label: "Chatbot adoption to 90%",
    description: "Get more visitors using the AI assistant",
    effect: { revenue: 0.07, leads: 0.15, bookings: 0.12 },
  },
];

export type DemandHeatmapRow = { day: string; slots: number[] };

export const demandHeatmap = {
  dayparts: ["Morning", "Lunch", "Afternoon", "Evening"],
  data: [
    { day: "Mon", slots: [20, 55, 35, 40] },
    { day: "Tue", slots: [25, 60, 38, 42] },
    { day: "Wed", slots: [30, 65, 40, 50] },
    { day: "Thu", slots: [28, 62, 42, 55] },
    { day: "Fri", slots: [35, 70, 48, 90] },
    { day: "Sat", slots: [55, 85, 75, 95] },
    { day: "Sun", slots: [40, 50, 45, 30] },
  ] as DemandHeatmapRow[],
};

export type AutomationEvent = { id: string; label: string; detail: string };

export const automationEvents: AutomationEvent[] = [
  { id: "1", label: "Weekly report generated", detail: "Sent to your inbox automatically" },
  { id: "2", label: "New leads categorised", detail: "12 leads sorted by intent" },
  { id: "3", label: "Customer sentiment analysed", detail: "94% positive this week" },
  { id: "4", label: "Follow-up emails scheduled", detail: "8 customers queued for a check-in" },
  { id: "5", label: "Revenue forecast updated", detail: "Next 30 days recalculated" },
  { id: "6", label: "Dashboard refreshed", detail: "Latest data pulled in" },
  { id: "7", label: "Review requests sent", detail: "5 happy customers prompted to leave a review" },
  { id: "8", label: "Booking reminders sent", detail: "14 upcoming appointments confirmed" },
];

// Baseline figures the What-If Simulator applies its lever multipliers to —
// matches the Revenue/Leads/Bookings KPIs shown elsewhere on the dashboard.
export const whatIfBaseline = { revenue: 18400, leads: 63, bookings: 89 };

export type FunnelStep = { label: string; value: number };

export const funnelSteps: FunnelStep[] = [
  { label: "Leads", value: 240 },
  { label: "Enquiries", value: 168 },
  { label: "Bookings", value: 89 },
  { label: "Customers", value: 63 },
];
