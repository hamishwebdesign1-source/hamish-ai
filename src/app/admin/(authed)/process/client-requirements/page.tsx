import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Tier = "A" | "B" | "C";

type Offering = {
  name: string;
  blurb: string;
  need: string;
  steps: string[];
};

const tierMeta: Record<Tier, { label: string; description: string; variant: "success" | "warning" | "secondary" }> = {
  A: {
    label: "Tier A — information only",
    description: "No system access needed. Ready to sell today.",
    variant: "success",
  },
  B: {
    label: "Tier B — needs OAuth/API to a tool they already use",
    description: "Ready conditionally — only if the client is already on the right platform.",
    variant: "warning",
  },
  C: {
    label: "Tier C — often no API at all",
    description: "The pitch can run ahead of what's actually buildable. Set expectations before selling it.",
    variant: "secondary",
  },
};

const offerings: Record<Tier, Offering[]> = {
  A: [
    {
      name: "AI Customer Assistant",
      blurb: "Chat widget answering customer questions",
      need: "Their FAQs, hours, pricing, policies, and common customer questions — a short interview covers most of it.",
      steps: [
        "Gather info",
        "Build the knowledge base / system prompt",
        "Embed the widget script on their live site",
        "Test with real questions",
        "Monitor conversations via their portal",
      ],
    },
    {
      name: "AI Business Knowledge Assistant",
      blurb: "Staff Q&A over internal docs",
      need: "Internal docs — handbook, SOPs, policies.",
      steps: [
        "Content-gathering session",
        "Populate knowledge base entries",
        "Give staff the access point (portal link, or wherever they already work)",
      ],
    },
    {
      name: "AI Content Automation",
      blurb: "Marketing content that keeps up",
      need: "Brand voice/tone, past posts, service details, and an approval habit (they review before it goes out, at least at first).",
      steps: [
        "Brand brief",
        "Generate on a schedule",
        "Client approves",
        "Publish (manual, or via their scheduler's API if one exists)",
      ],
    },
  ],
  B: [
    {
      name: "AI Sales Assistant",
      blurb: "Fast response to enquiries",
      need: "Access to wherever their leads land — realistically only clean if they're on Google Workspace (Gmail API, same pattern as the internal email-inbox integration). A generic hosting-provider email account has no API to hook into.",
      steps: [
        "Confirm their email provider",
        "If Google Workspace, get OAuth consent",
        "Triage + draft replies",
        "Human sends, or auto-sends per the existing accuracy-audited rules",
      ],
    },
    {
      name: "AI Analytics Assistant + AI Business Analytics",
      blurb: "The dashboard / copilot",
      need: "Whatever they actually use for traffic (Google Analytics), reviews (Google Business Profile), and payments (Stripe or similar).",
      steps: [
        "A short \"data audit\" — what tools does this business already run on",
        "Connect each source's API",
        "Normalise it into a per-client schema",
        "Wire the dashboard/copilot to read from it",
      ],
    },
  ],
  C: [
    {
      name: "AI Receptionist",
      blurb: "Never miss a booking",
      need: "Their actual booking system — and this is the catch: a lot of small-business booking tools (a paper diary, a generic calendar, a bare-bones scheduling widget) have no API at all.",
      steps: [
        "If it's Calendly/Acuity/similar with an API, integrate directly",
        "If not, the honest fallback is the AI captures the request and hands it to the owner rather than booking automatically",
        "Set that expectation before selling it as \"the AI books it\"",
      ],
    },
  ],
};

const generalRequirements = [
  "Hosting/domain access, or willingness to migrate",
  "Brand assets — logo, photos, copy",
  "For an existing WordPress/Wix/Squarespace site: an admin/collaborator invite rather than a full account handover",
];

export default function ClientRequirementsPage() {
  return (
    <div>
      <Link
        href="/admin/process"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Process map
      </Link>

      <h1 className="text-page-title mt-3">What we&apos;d need from a client</h1>
      <p className="text-page-subtitle mt-1 max-w-2xl">
        For every offering on the site to be reality rather than a demo, grouped by how hard that ask actually is —
        so the sales conversation can set the right expectation up front.
      </p>

      <div className="mt-8 space-y-8">
        {(Object.keys(tierMeta) as Tier[]).map((tier) => (
          <div key={tier}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={tierMeta[tier].variant}>{tierMeta[tier].label}</Badge>
              <p className="text-sm text-muted-foreground">{tierMeta[tier].description}</p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {offerings[tier].map((o) => (
                <Card key={o.name}>
                  <CardHeader>
                    <CardTitle>{o.name}</CardTitle>
                    <CardDescription>{o.blurb}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Need: </span>
                      {o.need}
                    </p>
                    <ol className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                      {o.steps.map((s, i) => (
                        <li key={s} className="flex gap-2">
                          <span className="shrink-0 font-mono text-xs text-muted-foreground/60">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>General website work</CardTitle>
          <CardDescription>Builds and maintenance plans, regardless of which AI offering is attached.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {generalRequirements.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-accent">•</span>
                {r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-8 border-accent/30 bg-accent/5">
        <CardContent className="pt-6">
          <p className="text-sm text-foreground">
            <span className="font-medium">The one thing worth remembering: </span>
            Tier A is genuinely ready to sell today. Tier B is ready <em>conditionally</em> — only for clients already
            on the right platform. Tier C is the one where the pitch is ahead of what&apos;s buildable for some clients,
            and probably needs a caveat in the sales conversation rather than a promise.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
