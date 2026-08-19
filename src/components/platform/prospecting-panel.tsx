"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Search,
  ExternalLink,
  LoaderCircle,
  CircleAlert,
  Tag,
  MapPin,
  UserPlus,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Gauge,
  Sparkles,
  LayoutTemplate,
  WandSparkles,
  ClipboardList,
  Copy,
  PhoneCall,
  FileText,
  Calendar,
  MessageCircle,
  Send,
  MessageSquareText,
  BellRing,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateProspectingConfig,
  runDiscovery,
  convertProspectToClient,
  researchProspect,
  generateWebsiteMockup,
  generateIcp,
  generateSalesKit,
  markProspectContacted,
  markProspectReplied,
} from "@/app/studio/(authed)/prospects/actions";
import type { UsageStatus } from "@/lib/usage-limits";
import type { LeadResearch, ScoreBreakdown } from "@/lib/research-lead";
import type { WebsiteMockup } from "@/lib/draft-website-mockup";
import type { SalesKit } from "@/lib/draft-sales-kit";
import { getLeadCadenceAction, leadNeedsFollowUp } from "@/lib/lead-status";

type Prospect = {
  id: string;
  business_name: string;
  category: string | null;
  neighbourhood: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  score: number | null;
  score_breakdown: ScoreBreakdown | null;
  research: LeadResearch | null;
  research_generated_at: string | null;
  website_mockup: WebsiteMockup | null;
  sales_kit: SalesKit | null;
  contacted_at: string | null;
  last_contact_method: string | null;
  replied_at: string | null;
  created_at: string;
};

function formatDaysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// Manual tracking, not automated — a tenant clicks these after they've
// actually emailed or called a prospect themselves. Hooking up a tenant's
// own inbox (Gmail/Outlook) so this fills in on its own is a real,
// separate feature (per-tenant OAuth, Google/Microsoft app verification),
// not something bolted on here.
function ContactTrackingControl({ prospect }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (prospect.status === "converted") return null;

  if (!prospect.contacted_at) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await markProspectContacted(prospect.id);
              if (r && "error" in r) setError(r.error ?? "Failed to update.");
            })
          }
        >
          <Send className="size-3.5" /> Mark as contacted
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  if (prospect.replied_at) {
    return (
      <Badge variant="secondary" className="gap-1">
        <MessageSquareText className="size-3" /> Replied
      </Badge>
    );
  }

  const cadenceAction = getLeadCadenceAction(prospect);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">
        Contacted {formatDaysAgo(prospect.contacted_at)}
        {prospect.last_contact_method ? ` by ${prospect.last_contact_method}` : ""}
      </span>
      {cadenceAction && (
        <span className="flex items-center gap-1 text-xs font-medium text-destructive">
          <BellRing className="size-3.5 shrink-0" />
          {cadenceAction === "call" ? "Call due" : "Follow-up due"}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await markProspectReplied(prospect.id);
            if (r && "error" in r) setError(r.error ?? "Failed to update.");
          })
        }
      >
        <MessageSquareText className="size-3.5" /> Mark as replied
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

// A single row's own convert-to-client mini-form — its own component so
// each prospect card's open/closed and pending state is independent, not
// one shared bit of state on the parent tracking "which row is open."
function ConvertToClientControl({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(prospect.email ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof convertProspectToClient>> | null>(null);

  if (prospect.status === "converted") {
    return <Badge variant="secondary">Client</Badge>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" /> Convert to client
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@business.com"
          className="h-8 w-44 text-xs"
          autoFocus
        />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await convertProspectToClient(prospect.id, email);
              setResult(r);
              if ("ok" in r) setOpen(false);
            })
          }
        >
          {pending ? "…" : "Confirm"}
        </Button>
      </div>
      {result && "error" in result && <span className="text-xs text-destructive">{result.error}</span>}
    </div>
  );
}

function ResearchTrigger({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-center">
      <p className="text-sm text-muted-foreground">Not researched yet — no contact details or opportunity analysis found.</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await researchProspect(prospectId);
            if (r && "error" in r) setError(r.error ?? "Research failed.");
          })
        }
      >
        {pending ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin" /> Researching…
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5" /> Research this business
          </>
        )}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const FIT_STYLES: Record<LeadResearch["ai_opportunity_fit"], string> = {
  high: "text-accent",
  medium: "text-muted-foreground",
  low: "text-muted-foreground",
};

const SCORE_DIMENSIONS: { key: keyof Omit<ScoreBreakdown, "overall">; label: string }[] = [
  { key: "fit", label: "Fit" },
  { key: "need", label: "Need" },
  { key: "value", label: "Value" },
  { key: "confidence", label: "Confidence" },
];

// Four dimensions rather than one number, so a user can see *why* two
// prospects with the same overall score are actually different — e.g. a
// no-website business scores high on need but lower on confidence, which
// a single 0-5 score would flatten into an identical-looking result.
function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {SCORE_DIMENSIONS.map(({ key, label }) => (
        <div key={key}>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{label}</span>
            <span className="font-mono">{breakdown[key]}/5</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(breakdown[key] / 5) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResearchSummary({ research, scoreBreakdown }: { research: LeadResearch; scoreBreakdown: ScoreBreakdown | null }) {
  return (
    <div className="space-y-4">
      {scoreBreakdown && <ScoreBreakdownBars breakdown={scoreBreakdown} />}

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Lightbulb className="size-3.5 shrink-0" />
          Why pursue this one
        </p>
        <p className="mt-1 text-sm">{research.pursue_because}</p>
      </div>

      <p className="text-sm text-muted-foreground">{research.business_summary}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{research.estimated_project_value_band}</Badge>
        <Badge variant="secondary" className="capitalize">
          {research.conversion_probability_band} conversion probability
        </Badge>
        <span className={`inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 capitalize ${FIT_STYLES[research.ai_opportunity_fit]}`}>
          <Gauge className="size-3" />
          {research.ai_opportunity_fit} AI fit
        </span>
      </div>

      {research.weaknesses.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ThumbsDown className="size-3.5 shrink-0" /> Weaknesses found
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.weaknesses.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {research.strengths.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ThumbsUp className="size-3.5 shrink-0" /> Strengths
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {research.ai_opportunities.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" /> AI opportunities
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            {research.ai_opportunities.map((o) => (
              <li key={o}>• {o}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-secondary/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Suggested opening line</p>
        <p className="mt-1 text-sm italic">&ldquo;{research.suggested_sales_angle}&rdquo;</p>
      </div>
    </div>
  );
}

// The mockup preview — deliberately plain (no custom design, no images),
// so the framing is honest about what this is: written homepage copy, not
// the real hand-built concept pages HamishAI itself builds. A border and
// a little internal padding is enough to read as "a preview of a page,"
// without pretending to be a finished website.
function WebsiteMockupPreview({ mockup }: { mockup: WebsiteMockup }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-secondary/40 px-4 py-2">
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Homepage preview</p>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="font-heading text-lg font-semibold text-balance">{mockup.hero_headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{mockup.hero_subheadline}</p>
        </div>
        <p className="text-sm">{mockup.problem_statement}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {mockup.services.map((s) => (
            <div key={s.name} className="rounded-md bg-secondary/30 p-2.5">
              <p className="text-xs font-semibold">{s.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
        <p className="rounded-md border border-accent/30 bg-accent/5 p-2.5 text-xs">{mockup.ai_pitch}</p>
        <Button size="sm" disabled className="pointer-events-none opacity-80">
          {mockup.cta_text}
        </Button>
      </div>
    </div>
  );
}

function WebsiteMockupSection({ prospect }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <LayoutTemplate className="size-3.5 shrink-0" /> Website mockup
      </p>
      {prospect.website_mockup ? (
        <WebsiteMockupPreview mockup={prospect.website_mockup} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No mockup yet — AI-written homepage copy for this prospect, not a designed page.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await generateWebsiteMockup(prospect.id);
                if (r && "error" in r) setError(r.error ?? "Mockup generation failed.");
              })
            }
          >
            {pending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Writing…
              </>
            ) : (
              <>
                <LayoutTemplate className="size-3.5" /> Generate mockup
              </>
            )}
          </Button>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

// Small, local — copies its own text and shows a brief confirmation, no
// shared state needed since each outreach piece has its own button.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent"
    >
      <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SalesKitPreview({ kit }: { kit: SalesKit }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> Outreach email</p>
          <CopyButton text={`${kit.outreach_email.subject}\n\n${kit.outreach_email.body}`} />
        </div>
        <p className="mt-2 text-xs font-medium">{kit.outreach_email.subject}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{kit.outreach_email.body}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> Follow-up email</p>
          <CopyButton text={`${kit.follow_up_email.subject}\n\n${kit.follow_up_email.body}`} />
        </div>
        <p className="mt-2 text-xs font-medium">{kit.follow_up_email.subject}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{kit.follow_up_email.body}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><PhoneCall className="size-3.5 shrink-0 text-muted-foreground" /> Call script</p>
          <CopyButton
            text={`Opener: ${kit.call_script.opener}\n\nTalking points:\n${kit.call_script.talking_points.map((t) => `- ${t}`).join("\n")}\n\nIf hesitant: ${kit.call_script.if_hesitant}\n\nClosing ask: ${kit.call_script.closing_ask}`}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{kit.call_script.opener}</p>
        <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
          {kit.call_script.talking_points.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><MessageCircle className="size-3.5 shrink-0 text-muted-foreground" /> LinkedIn message</p>
          <CopyButton text={kit.linkedin_message} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{kit.linkedin_message}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Calendar className="size-3.5 shrink-0 text-muted-foreground" /> Meeting agenda</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {kit.meeting_agenda.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><FileText className="size-3.5 shrink-0 text-muted-foreground" /> Proposal outline</p>
          <p className="mt-2 text-xs text-muted-foreground">{kit.proposal_outline.overview}</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {kit.proposal_outline.included.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SalesKitSection({ prospect }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ClipboardList className="size-3.5 shrink-0" /> Outreach kit
      </p>
      {prospect.sales_kit ? (
        <SalesKitPreview kit={prospect.sales_kit} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Not generated yet — email, follow-up, call script, LinkedIn message, meeting agenda and proposal outline, in one go.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await generateSalesKit(prospect.id);
                if (r && "error" in r) setError(r.error ?? "Sales kit generation failed.");
              })
            }
          >
            {pending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Writing…
              </>
            ) : (
              <>
                <ClipboardList className="size-3.5" /> Generate outreach kit
              </>
            )}
          </Button>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const hasContact = prospect.phone || prospect.email;

  return (
    <Card>
      <CardContent className="py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{prospect.business_name}</p>
              {/* score_breakdown.overall is the same average shown in the
                  expanded fit/need/value/confidence bars below — showing
                  the old, unrelated single-formula score here instead
                  would show two different numbers for "the score" on the
                  same card, which is exactly what happened before this
                  fix. Falls back to the old score only for a prospect
                  researched before score_breakdown existed. */}
              {(prospect.score_breakdown?.overall ?? prospect.score) !== null && (
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  score {prospect.score_breakdown?.overall ?? prospect.score}/5
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {[prospect.category, prospect.neighbourhood].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {leadNeedsFollowUp(prospect) && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                <BellRing className="size-3 shrink-0" />
                {getLeadCadenceAction(prospect) === "call" ? "Call due" : "Follow-up due"}
              </span>
            )}
            {prospect.status !== "converted" && (
              <Badge variant="secondary" className="capitalize">
                {prospect.status.replace(/_/g, " ")}
              </Badge>
            )}
            {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {prospect.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                  <a href={`tel:${prospect.phone}`} className="hover:text-accent">
                    {prospect.phone}
                  </a>
                </span>
              )}
              {prospect.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${prospect.email}`} className="hover:text-accent">
                    {prospect.email}
                  </a>
                </span>
              )}
              {prospect.website && (
                <a
                  href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  Website
                </a>
              )}
              {!hasContact && !prospect.website && (
                <span className="text-xs text-muted-foreground">No contact details found for this business yet.</span>
              )}
            </div>

            {prospect.research ? (
              <ResearchSummary research={prospect.research} scoreBreakdown={prospect.score_breakdown} />
            ) : (
              <ResearchTrigger prospectId={prospect.id} />
            )}

            {prospect.research && <WebsiteMockupSection prospect={prospect} />}

            {prospect.research && <SalesKitSection prospect={prospect} />}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <ContactTrackingControl prospect={prospect} />
              <ConvertToClientControl prospect={prospect} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// A single client component rather than splitting settings/results/usage
// into three — they all react to the same runDiscovery() call (a fresh
// run changes the usage bar and the results list together), and this is
// still a small enough page that three separate components would just add
// prop-plumbing without buying independent reusability.
export function ProspectingPanel({
  initialCategories,
  initialAreas,
  usage,
  prospects,
}: {
  initialCategories: string[];
  initialAreas: string[];
  usage: UsageStatus | null;
  prospects: Prospect[];
}) {
  const [categories, setCategories] = useState(initialCategories.join(", "));
  const [areas, setAreas] = useState(initialAreas.join(", "));
  const [savePending, startSave] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const [icpDescription, setIcpDescription] = useState("");
  const [icpPending, startIcp] = useTransition();
  const [icpError, setIcpError] = useState<string | null>(null);
  const [icpNotes, setIcpNotes] = useState<string | null>(null);

  function handleGenerateIcp() {
    setIcpError(null);
    setIcpNotes(null);
    startIcp(async () => {
      const result = await generateIcp(icpDescription);
      if ("error" in result) {
        setIcpError(result.error);
        return;
      }
      // Fills the existing category/area fields rather than saving
      // directly — the AI's interpretation is a starting point to review
      // and edit, not a decision made on the user's behalf.
      setCategories(result.icp.categories.join(", "));
      setAreas(result.icp.areas.join(", "));
      setIcpNotes(result.icp.notes || null);
    });
  }

  const [runPending, startRun] = useTransition();
  const [runResult, setRunResult] = useState<Awaited<ReturnType<typeof runDiscovery>> | null>(null);

  // Shared by both the explicit "Save niche" button and "Find prospects
  // now" — this used to be two separate actions, which meant typing a
  // niche and clicking "Find prospects now" without first clicking "Save"
  // ran discovery against whatever was already saved (nothing, the first
  // time), not what was actually in the boxes. "Find prospects now" now
  // always saves first, so there's no state where the two can disagree.
  async function saveNiche() {
    return updateProspectingConfig({
      categories: categories.split(",").map((s) => s.trim()).filter(Boolean),
      areas: areas.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  function handleSave() {
    setSaveStatus("idle");
    startSave(async () => {
      const result = await saveNiche();
      setSaveStatus("error" in result ? "error" : "saved");
    });
  }

  function handleRun() {
    setRunResult(null);
    startRun(async () => {
      const saveResult = await saveNiche();
      if ("error" in saveResult) {
        setRunResult({ error: saveResult.error ?? "Failed to save your niche." });
        return;
      }
      const result = await runDiscovery();
      setRunResult(result);
    });
  }

  const atLimit = usage !== null && !usage.allowed;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs_verification" | "contacted" | "needs_followup" | "converted">("all");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">("score");

  // Client-side over the full prospect list, not a server round-trip —
  // everything's already loaded for the page, and this is a few dozen
  // rows at most today, not a scale where that trade-off matters yet.
  const visibleProspects = useMemo(() => {
    let list = prospects;
    if (statusFilter === "needs_followup") list = list.filter((p) => leadNeedsFollowUp(p));
    else if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.business_name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sortBy === "score") sorted.sort((a, b) => (b.score_breakdown?.overall ?? b.score ?? -1) - (a.score_breakdown?.overall ?? a.score ?? -1));
    else if (sortBy === "newest") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sortBy === "name") sorted.sort((a, b) => a.business_name.localeCompare(b.business_name));
    return sorted;
  }, [prospects, search, statusFilter, sortBy]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Prospects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your niche and geography, then find real businesses matching it — the same engine HamishAI runs its
          own weekly search on.
        </p>
      </div>

      {usage && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="font-heading font-semibold">This month</span>
              <span className="font-mono text-muted-foreground">
                {usage.used} / {usage.limit} researched
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }}
              />
            </div>
            {atLimit && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="size-3.5 shrink-0" />
                Monthly limit reached — upgrade your plan to keep finding prospects this month.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <p className="font-heading text-sm font-semibold">Describe your ideal customer</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One sentence is enough — it fills in the fields below for you to review before saving.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
            <Textarea
              value={icpDescription}
              onChange={(e) => setIcpDescription(e.target.value)}
              placeholder="e.g. Independent gyms and fitness studios across Kent's main towns, no chains."
              className="min-h-9 flex-1 text-sm"
              rows={2}
            />
            <Button size="sm" variant="outline" onClick={handleGenerateIcp} disabled={icpPending || !icpDescription.trim()} className="shrink-0">
              {icpPending ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  <WandSparkles className="size-3.5" /> Generate
                </>
              )}
            </Button>
          </div>
          {icpError && <p className="mt-2 text-xs text-destructive">{icpError}</p>}
          {icpNotes && <p className="mt-2 text-xs text-accent">{icpNotes}</p>}

          <p className="mt-5 font-heading text-sm font-semibold">Your niche</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categories" className="text-xs">
                <Tag className="size-3" /> Categories
              </Label>
              <Input
                id="categories"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="e.g. Accountants, Bookkeepers"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="areas" className="text-xs">
                <MapPin className="size-3" /> Areas
              </Label>
              <Input
                id="areas"
                value={areas}
                onChange={(e) => setAreas(e.target.value)}
                placeholder="e.g. Manchester, Leeds"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Comma-separated. Both are required — be specific with areas (a town or city works better than a whole
            county or region).
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={savePending}>
              {savePending ? "Saving…" : "Save niche"}
            </Button>
            {saveStatus === "saved" && <span className="text-xs text-accent">Saved.</span>}
            {saveStatus === "error" && <span className="text-xs text-destructive">Couldn&apos;t save — try again.</span>}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleRun} disabled={runPending || atLimit} className="w-full sm:w-auto">
        {runPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" /> Searching…
          </>
        ) : (
          <>
            <Search className="size-4" /> Find prospects now
          </>
        )}
      </Button>

      {runResult && "error" in runResult && (
        <p className="text-sm text-destructive">{runResult.error}</p>
      )}
      {runResult && "nicheRequired" in runResult && runResult.nicheRequired && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Enter at least one category and one area above before finding prospects.
        </p>
      )}
      {runResult && "billingRequired" in runResult && runResult.billingRequired && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Your trial has ended.{" "}
          <Link href="/studio/billing" className="underline underline-offset-2">
            Subscribe to keep finding prospects
          </Link>
          .
        </p>
      )}
      {runResult && "limitReached" in runResult && runResult.limitReached && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Monthly limit reached ({runResult.limitReached.used} of {runResult.limitReached.limit}) — nothing new
          searched this run.
        </p>
      )}
      {runResult && "inserted" in runResult && !runResult.limitReached && (
        <p className="text-sm text-accent">
          Found {runResult.inserted.length} new prospect{runResult.inserted.length === 1 ? "" : "s"}
          {runResult.skippedDuplicates.length > 0 ? ` (${runResult.skippedDuplicates.length} already known, skipped)` : ""}.
        </p>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading text-sm font-semibold">
            Your prospects{prospects.length > 0 ? ` (${visibleProspects.length}${visibleProspects.length !== prospects.length ? ` of ${prospects.length}` : ""})` : ""}
          </p>
          {prospects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="h-8 w-40 text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All statuses</option>
                <option value="needs_verification">Needs verification</option>
                <option value="contacted">Contacted</option>
                <option value="needs_followup">Follow-up due</option>
                <option value="converted">Converted</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="score">Highest score</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          )}
        </div>
        {prospects.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No prospects yet — set your niche above and click &quot;Find prospects now.&quot;
          </div>
        ) : visibleProspects.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No prospects match that search or filter.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {visibleProspects.map((p) => (
              <ProspectCard key={p.id} prospect={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
