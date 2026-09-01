"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
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
  Trash2,
  CheckCheck,
  PoundSterling,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import {
  updateProspectingConfig,
  runDiscovery,
  searchProspects,
  convertProspectToClient,
  researchProspect,
  generateWebsiteMockup,
  generateIcp,
  generateSalesKit,
  sendProposal,
  assignProspect,
  markProspectContacted,
  markProspectReplied,
  markProspectQualified,
  markProspectLost,
  updateProspectDealValue,
  deleteProspect,
} from "@/app/studio/(authed)/prospects/actions";
import { DiscoveryResultMessage, type DiscoveryResult } from "@/components/platform/discovery-result-message";
import type { UsageStatus } from "@/lib/usage-limits";
import type { LeadResearch, ScoreBreakdown } from "@/lib/research-lead";
import type { WebsiteMockup } from "@/lib/draft-website-mockup";
import type { SalesKit } from "@/lib/draft-sales-kit";
import { getLeadCadenceAction, leadNeedsFollowUp } from "@/lib/lead-status";
import { appendBookingLink } from "@/lib/booking-link";

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
  deal_value_pence: number | null;
  created_at: string;
  assigned_to: string | null;
};

type TeamMember = { email: string; role: "owner" | "member" };

// Same shared inline-<select> chrome as requests-panel.tsx/
// projects-panel.tsx's own selectClasses.
const selectClasses =
  "h-7 rounded-lg border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Studio big-ticket ("proposal send-and-track workflow") — the latest
// proposal_tokens row for a prospect, reduced from the flat list
// prospects/page.tsx fetches (a prospect can have more than one if a
// proposal was sent twice; ProspectingPanel below keeps only the most
// recent per prospect_id, same "aggregate in the panel" shape
// requests-panel.tsx uses for tasksByRequest).
type ProposalToken = { prospect_id: string; created_at: string; viewed_at: string | null; accepted_at: string | null };

function formatMoney(pence: number) {
  return `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

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
// Built fresh with useOptimistic (BACKLOG.md's 2026-08-31 scoping note,
// candidate 1) rather than the hand-rolled useState-flip-then-revert
// pattern used elsewhere in this codebase (CampaignCard.toggleStatus etc)
// — there was no existing optimism here at all to migrate. Rollback UI
// per that same note: an inline text-destructive line under the row,
// plus a brief bg-destructive/10 highlight on the row itself, cleared
// after ~1.5s — the same transient-boolean-plus-timeout mechanism
// CopyButton/EmbedChatbotControl already use for their own "copied" state.
export function ContactTrackingControl({ prospect }: { prospect: Prospect }) {
  const [optimisticProspect, setOptimisticProspect] = useOptimistic(
    prospect,
    (state: Prospect, patch: Partial<Prospect>) => ({ ...state, ...patch })
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rolledBack, setRolledBack] = useState(false);

  function flagRollback() {
    setRolledBack(true);
    setTimeout(() => setRolledBack(false), 1500);
  }

  if (optimisticProspect.status === "converted") return null;

  const rowHighlight = rolledBack ? "bg-destructive/10" : "";

  if (!optimisticProspect.contacted_at) {
    return (
      <div className="flex flex-col gap-1">
        <div className={`flex items-center gap-2 rounded-md p-1 transition-colors ${rowHighlight}`}>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setOptimisticProspect({ status: "contacted", contacted_at: new Date().toISOString(), last_contact_method: "email" });
                const r = await markProspectContacted(prospect.id);
                if (r && "error" in r) {
                  setError(r.error ?? "Failed to update — try again.");
                  flagRollback();
                }
              })
            }
          >
            <Send className="size-3.5" /> Mark as contacted
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (optimisticProspect.replied_at) {
    return (
      <Badge variant="secondary" className="gap-1">
        <MessageSquareText className="size-3" /> Replied
      </Badge>
    );
  }

  const cadenceAction = getLeadCadenceAction(optimisticProspect);

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex flex-wrap items-center gap-2 rounded-md p-1 transition-colors ${rowHighlight}`}>
        <span className="text-xs text-muted-foreground">
          Contacted {formatDaysAgo(optimisticProspect.contacted_at)}
          {optimisticProspect.last_contact_method ? ` by ${optimisticProspect.last_contact_method}` : ""}
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
              setOptimisticProspect({ replied_at: new Date().toISOString() });
              const r = await markProspectReplied(prospect.id);
              if (r && "error" in r) {
                setError(r.error ?? "Failed to update — try again.");
                flagRollback();
              }
            })
          }
        >
          <MessageSquareText className="size-3.5" /> Mark as replied
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
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

// Two-step confirm, same shape as ConvertToClientControl's open/confirm
// state — a single click can't remove a prospect outright, since unlike
// most actions here this one isn't reversible. Never shown for a
// converted prospect, matching deleteProspect()'s own server-side refusal
// (it's now a client, not something to remove from here).
function RemoveProspectControl({ prospect }: { prospect: Prospect }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (prospect.status === "converted") return null;

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
        <Trash2 className="size-3.5" /> Remove
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Remove this prospect?</span>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await deleteProspect(prospect.id);
            if (r && "error" in r) {
              setError(r.error ?? "Failed to remove.");
              setConfirming(false);
            }
          })
        }
      >
        {pending ? "…" : "Confirm"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

// Platform readiness audit P1: a real pipeline beyond needs_verification
// -> contacted -> converted, which had no room for "reviewed, worth
// pursuing" or "pursued, didn't work out." Hidden once the prospect has
// reached either of its own terminal states (converted, or already
// lost) — a won or lost deal isn't still "qualifiable."
// Same useOptimistic-from-scratch treatment as ContactTrackingControl
// above, per the same scoping note — see its comment for why.
export function PipelineStageControl({ prospect }: { prospect: Prospect }) {
  const [optimisticProspect, setOptimisticProspect] = useOptimistic(
    prospect,
    (state: Prospect, patch: Partial<Prospect>) => ({ ...state, ...patch })
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rolledBack, setRolledBack] = useState(false);

  function flagRollback() {
    setRolledBack(true);
    setTimeout(() => setRolledBack(false), 1500);
  }

  // Checked against the real, server-confirmed prop, not the optimistic
  // local guess — an in-flight (unconfirmed) "mark as lost" click sets
  // optimisticProspect.status to "lost" immediately, and if this guard
  // read that instead, the whole row (and its own rollback error message)
  // would disappear before the server ever confirmed the write, which
  // would defeat the rollback UI below. Once the write actually succeeds,
  // revalidatePath refreshes this prop for real and the row correctly
  // disappears for good.
  if (prospect.status === "converted" || prospect.status === "lost") return null;

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 rounded-md p-1 transition-colors ${rolledBack ? "bg-destructive/10" : ""}`}>
        {optimisticProspect.status === "lost" ? (
          <span className="text-xs text-muted-foreground">Marked as lost…</span>
        ) : (
          <>
            {optimisticProspect.status !== "qualified" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    setOptimisticProspect({ status: "qualified" });
                    const r = await markProspectQualified(prospect.id);
                    if (r && "error" in r) {
                      setError(r.error ?? "Failed to update — try again.");
                      flagRollback();
                    }
                  })
                }
              >
                <CheckCheck className="size-3.5" /> Mark as qualified
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  setOptimisticProspect({ status: "lost" });
                  const r = await markProspectLost(prospect.id);
                  if (r && "error" in r) {
                    setError(r.error ?? "Failed to update — try again.");
                    flagRollback();
                  }
                })
              }
            >
              <ThumbsDown className="size-3.5" /> Mark as lost
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Entirely optional, never AI-generated — see updateProspectDealValue()'s
// own comment on why a made-up number would be worse than no number.
export function DealValueControl({ prospect }: { prospect: Prospect }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(prospect.deal_value_pence ? String(prospect.deal_value_pence / 100) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Flagged in BACKLOG.md's useOptimistic scoping note as safe but too
  // low-frequency to be worth bespoke optimistic-UI engineering — the real
  // bug here was that the result was never checked at all, silently
  // reverting to the stale value on a failed save. Fixed as an ordinary
  // bug fix: check the result, keep the editor open with the same inline
  // error convention as everything else in this file on failure.
  function save() {
    setError(null);
    startTransition(async () => {
      const parsed = value.trim() ? parseFloat(value) : null;
      const r = await updateProspectDealValue(prospect.id, parsed);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to update — try again.");
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setEditing(true);
        }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
      >
        <PoundSterling className="size-3" />
        {prospect.deal_value_pence ? formatMoney(prospect.deal_value_pence) : "Add deal value"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          autoFocus
          className="h-7 w-24 text-xs"
          placeholder="£"
        />
        <Button size="xs" disabled={pending} onClick={save}>
          {pending ? "…" : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
      className="flex items-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground hover:text-accent"
    >
      <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SendProposalControl({ prospectId, prospectEmail, proposalToken }: { prospectId: string; prospectEmail: string | null; proposalToken: ProposalToken | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await sendProposal(prospectId);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to send — try again.");
        return;
      }
      setJustSent(true);
    });
  }

  if (proposalToken?.accepted_at) {
    return <Badge variant="success">Accepted</Badge>;
  }
  if (justSent || proposalToken) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge variant={proposalToken?.viewed_at ? "secondary" : "outline"}>{proposalToken?.viewed_at ? "Viewed" : "Sent"}</Badge>
        <button type="button" onClick={send} disabled={pending || !prospectEmail} className="underline underline-offset-2 hover:no-underline disabled:opacity-50">
          {pending ? "Resending…" : "Resend"}
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={send}
        disabled={pending || !prospectEmail}
        title={prospectEmail ? undefined : "This prospect has no contact email on file."}
        className="flex shrink-0 items-center gap-1 text-[11px] text-accent underline underline-offset-2 hover:no-underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        <Send className="size-3" /> {pending ? "Sending…" : "Send proposal"}
      </button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </span>
  );
}

function SalesKitPreview({
  kit,
  bookingLink,
  prospectId,
  prospectEmail,
  proposalToken,
}: {
  kit: SalesKit;
  bookingLink: string | null;
  prospectId: string;
  prospectEmail: string | null;
  proposalToken: ProposalToken | null;
}) {
  // Roadmap item #9 — same deterministic append sendForOrg() (autonomous-
  // outreach.ts) applies before an automated send, applied here so a
  // human copying either draft out to send themselves sees (and sends)
  // the exact same booking link, not a shorter version that quietly
  // diverges from what an automated follow-up would have included.
  const outreachBody = appendBookingLink(kit.outreach_email.body, bookingLink);
  const followUpBody = appendBookingLink(kit.follow_up_email.body, bookingLink);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> Outreach email</p>
          <CopyButton text={`${kit.outreach_email.subject}\n\n${outreachBody}`} />
        </div>
        <p className="mt-2 text-xs font-medium">{kit.outreach_email.subject}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{outreachBody}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> Follow-up email</p>
          <CopyButton text={`${kit.follow_up_email.subject}\n\n${followUpBody}`} />
        </div>
        <p className="mt-2 text-xs font-medium">{kit.follow_up_email.subject}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{followUpBody}</p>
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
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><FileText className="size-3.5 shrink-0 text-muted-foreground" /> Proposal outline</p>
            <div className="flex shrink-0 items-center gap-3">
              <SendProposalControl prospectId={prospectId} prospectEmail={prospectEmail} proposalToken={proposalToken} />
              {/* Roadmap item #6 — plain same-origin navigation, not a fetch:
                  the browser's own session cookie is what authorises this
                  (proposal-pdf/route.ts), same as any other in-app link. */}
              <a
                href={`/api/studio/prospects/${prospectId}/proposal-pdf`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[11px] text-accent underline underline-offset-2 hover:no-underline"
              >
                Download PDF
              </a>
            </div>
          </div>
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

function SalesKitSection({ prospect, bookingLink, proposalToken }: { prospect: Prospect; bookingLink: string | null; proposalToken: ProposalToken | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {prospect.sales_kit ? (
        <SalesKitPreview
          kit={prospect.sales_kit}
          bookingLink={bookingLink}
          prospectId={prospect.id}
          prospectEmail={prospect.email}
          proposalToken={proposalToken}
        />
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

function ProspectCard({
  prospect,
  selected,
  onToggleSelect,
  bookingLink,
  proposalToken,
  teamMembers,
}: {
  prospect: Prospect;
  selected: boolean;
  onToggleSelect: () => void;
  bookingLink: string | null;
  proposalToken: ProposalToken | null;
  teamMembers: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const hasContact = prospect.phone || prospect.email;
  const [assignee, setAssignee] = useState(prospect.assigned_to ?? "");
  const [assignPending, startAssign] = useTransition();

  function setProspectAssignee(next: string) {
    const prev = assignee;
    setAssignee(next);
    startAssign(async () => {
      const r = await assignProspect(prospect.id, next || null);
      if (r && "error" in r) setAssignee(prev);
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          {/* Studio improvement — bulk actions. Sibling to the toggle
              button rather than nested inside it (a checkbox inside a
              clickable row would fire both the toggle and the expand/
              collapse on one click) — same reasoning as clients-panel.tsx's
              website link using onClick={(e) => e.stopPropagation()}
              inside its own row button, just solved by not nesting at all
              here since this needs its own independent click target. */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${prospect.business_name}`}
            className="size-4 shrink-0 rounded border-border accent-accent"
          />
          {/* Studio big-ticket ("team collaboration") — same sibling-of-
              the-toggle-button reasoning as the checkbox above, and same
              gate as requests-panel.tsx's own assignee select: only
              meaningful once there's more than one person to hand this
              to. */}
          {teamMembers.length > 1 && (
            <select
              value={assignee}
              onChange={(e) => setProspectAssignee(e.target.value)}
              disabled={assignPending}
              aria-label={`Assign ${prospect.business_name}`}
              className={`${selectClasses} shrink-0`}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.email}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
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
                <Badge
                  variant={prospect.status === "qualified" ? "accent" : "secondary"}
                  className={`capitalize ${prospect.status === "lost" ? "opacity-60" : ""}`}
                >
                  {prospect.status.replace(/_/g, " ")}
                </Badge>
              )}
              {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
          </button>
        </div>

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
              <Tabs defaultValue="research">
                <TabsList>
                  <TabsTab value="research">
                    <Lightbulb className="size-3.5" /> Research
                  </TabsTab>
                  <TabsTab value="mockup">
                    <LayoutTemplate className="size-3.5" /> Website mockup
                  </TabsTab>
                  <TabsTab value="kit">
                    <ClipboardList className="size-3.5" /> Outreach kit
                  </TabsTab>
                </TabsList>
                <TabsPanel value="research">
                  <ResearchSummary research={prospect.research} scoreBreakdown={prospect.score_breakdown} />
                </TabsPanel>
                <TabsPanel value="mockup">
                  <WebsiteMockupSection prospect={prospect} />
                </TabsPanel>
                <TabsPanel value="kit">
                  <SalesKitSection prospect={prospect} bookingLink={bookingLink} proposalToken={proposalToken} />
                </TabsPanel>
              </Tabs>
            ) : (
              <ResearchTrigger prospectId={prospect.id} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <DealValueControl prospect={prospect} />
              <PipelineStageControl prospect={prospect} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <ContactTrackingControl prospect={prospect} />
              <div className="flex items-center gap-2">
                <RemoveProspectControl prospect={prospect} />
                <ConvertToClientControl prospect={prospect} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// DiscoveryResult / DiscoveryResultMessage moved to their own file
// (Studio improvement) — see discovery-result-message.tsx's own comment
// on why (studio-command-palette.tsx now reuses it too, and shouldn't
// have to pull in this whole panel module to get one small component).

// A single client component rather than splitting settings/results/usage
// into three — they all react to the same runDiscovery() call (a fresh
// run changes the usage bar and the results list together), and this is
// still a small enough page that three separate components would just add
// prop-plumbing without buying independent reusability.
export function ProspectingPanel({
  initialCategories,
  initialAreas,
  usage,
  purchasedCredits,
  prospects,
  bookingLink,
  proposalTokens,
  teamMembers,
  currentUserEmail,
}: {
  initialCategories: string[];
  initialAreas: string[];
  usage: UsageStatus | null;
  purchasedCredits: number;
  prospects: Prospect[];
  bookingLink: string | null;
  proposalTokens: ProposalToken[];
  teamMembers: TeamMember[];
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories.join(", "));
  const [areas, setAreas] = useState(initialAreas.join(", "));
  const [savePending, startSave] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Studio big-ticket ("proposal send-and-track workflow") — reduced to
  // the latest row per prospect_id. proposalTokens arrives ordered
  // newest-first (prospects/page.tsx's own query), so the first row seen
  // per id here is already the latest — nothing to compare timestamps
  // against.
  const latestProposalByProspect = useMemo(() => {
    const map = new Map<string, ProposalToken>();
    for (const t of proposalTokens) {
      if (!map.has(t.prospect_id)) map.set(t.prospect_id, t);
    }
    return map;
  }, [proposalTokens]);

  // Real-improvement pass — this page's own real shape, on closer
  // reading, isn't the Command Centre's "9 parallel content types"
  // (tabs was the right fix there); it's one setup form, one ad-hoc
  // search tool, and one list — the list being the actual reason
  // someone opens this page most days. The niche form was permanently
  // pushing that list down even for a returning tenant who configured
  // it once and never needs to see the full form again. Open by
  // default only while nothing's actually saved yet; collapsed once a
  // real niche exists, same established convention as
  // CommandCentreLayoutPanel and ClientsCopilot.
  const [nicheOpen, setNicheOpen] = useState(initialCategories.length === 0 || initialAreas.length === 0);

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
  const [runResult, setRunResult] = useState<DiscoveryResult | null>(null);

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

  // Purchased top-up credits (schema-prospect-credits.sql) extend the
  // monthly allowance rather than replacing it — discoverLeads() itself
  // already draws on them once the monthly cap is spent, so this button
  // must only actually disable once BOTH are exhausted. Getting this
  // wrong the other way (disabling on monthly usage alone) would leave
  // someone who just bought credits unable to use them from this screen
  // at all.
  const atLimit = usage !== null && !usage.allowed && purchasedCredits <= 0;
  const usingCredits = usage !== null && !usage.allowed && purchasedCredits > 0;

  // Search now — deliberately its own state, not layered onto
  // categories/areas/runResult above: this doesn't read or write the
  // saved niche at all, it's a one-off search for whatever's typed here.
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchPending, startSearch] = useTransition();
  const [searchResult, setSearchResult] = useState<Awaited<ReturnType<typeof searchProspects>> | null>(null);

  function handleSearch() {
    if (!searchLocation.trim()) return;
    setSearchResult(null);
    startSearch(async () => {
      const result = await searchProspects(searchLocation, searchCategory);
      setSearchResult(result);
    });
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "needs_verification" | "qualified" | "contacted" | "needs_followup" | "converted" | "lost"
  >("all");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">("score");
  // Studio big-ticket ("team collaboration") — only meaningful once
  // there's more than one person on the org, same gate as the assignee
  // select itself.
  const [mineOnly, setMineOnly] = useState(false);

  // Client-side over the full prospect list, not a server round-trip —
  // everything's already loaded for the page, and this is a few dozen
  // rows at most today, not a scale where that trade-off matters yet.
  const visibleProspects = useMemo(() => {
    let list = prospects;
    if (statusFilter === "needs_followup") list = list.filter((p) => leadNeedsFollowUp(p));
    else if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (mineOnly) list = list.filter((p) => p.assigned_to === currentUserEmail);
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
  }, [prospects, search, statusFilter, mineOnly, currentUserEmail, sortBy]);

  // Studio improvement — bulk "mark as contacted" for however many rows
  // are currently selected, calling the exact same markProspectContacted()
  // Server Action ContactTrackingControl already uses per-row, just once
  // per selected id instead of one click at a time. Selection is real ids
  // only (a Set, not "select all prospects" as a separate concept), so a
  // filter/search change that hides a selected row never silently expands
  // what a later bulk action would touch.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  // Studio improvement — bulk "generate outreach kits," same selection
  // set as bulk mark-contacted above, own pending/error/done state (a
  // real AI call per id, not a plain DB write, so it shouldn't share
  // bulkPending's "Updating…" wording or block on it). Capped, unlike
  // mark-contacted: each one is a real, costed Anthropic call, so a
  // selection larger than MAX_BULK_KITS disables the button rather than
  // firing a burst that would just fail most of the way through
  // generateSalesKit()'s own per-call usage/rate-limit check anyway — a
  // hard cap here is a better experience than a mostly-failed batch.
  // Sequential, not Promise.all, for the same reason: a burst of N
  // simultaneous calls is exactly what isStudioActionRateLimited()
  // exists to catch, so this paces itself instead of triggering it.
  const MAX_BULK_KITS = 5;
  const [kitsPending, startKits] = useTransition();
  const [kitsError, setKitsError] = useState<string | null>(null);
  const [kitsDone, setKitsDone] = useState<number | null>(null);
  const [kitsProgress, setKitsProgress] = useState<{ done: number; total: number } | null>(null);

  const visibleSelectedCount = visibleProspects.filter((p) => selected.has(p.id)).length;
  const allVisibleSelected = visibleProspects.length > 0 && visibleSelectedCount === visibleProspects.length;

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const p of visibleProspects) next.delete(p.id);
      } else {
        for (const p of visibleProspects) next.add(p.id);
      }
      return next;
    });
  }

  function bulkMarkContacted() {
    const ids = Array.from(selected);
    if (ids.length === 0 || bulkPending) return;
    setBulkError(null);
    setBulkDone(null);
    startBulk(async () => {
      const results = await Promise.all(ids.map((id) => markProspectContacted(id)));
      const failed = results.filter((r) => r && "error" in r).length;
      setSelected(new Set());
      if (failed > 0) {
        setBulkError(`${failed} of ${ids.length} failed to update — try again for those.`);
      }
      setBulkDone(ids.length - failed);
      // Explicit, unlike ContactTrackingControl's own per-row action —
      // that control has its own useOptimistic local state to show the
      // change instantly regardless; this bulk bar has no such per-row
      // optimism (it's driving N rows' worth of ProspectCard/
      // ContactTrackingControl state it doesn't own), so it needs the
      // real refresh itself rather than relying on one to happen
      // implicitly.
      router.refresh();
    });
  }

  function bulkGenerateKits() {
    const ids = Array.from(selected).slice(0, MAX_BULK_KITS);
    if (ids.length === 0 || kitsPending) return;
    setKitsError(null);
    setKitsDone(null);
    setKitsProgress({ done: 0, total: ids.length });
    startKits(async () => {
      let failed = 0;
      for (const id of ids) {
        const r = await generateSalesKit(id);
        if (r && "error" in r) failed++;
        setKitsProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : prev));
      }
      setSelected(new Set());
      setKitsProgress(null);
      if (failed > 0) setKitsError(`${failed} of ${ids.length} kits failed to generate — try those individually.`);
      setKitsDone(ids.length - failed);
      router.refresh();
    });
  }

  return (
    // Centered as one column (mx-auto), not just capped — capping alone
    // (the previous attempt) left the same content flush against the left
    // edge of a much wider main, with all the leftover space dumped on
    // the right: still visibly "off centre," just a smaller gap. A
    // header/nav that spans full width with a centered, moderate-width
    // body column below is the standard SaaS shape (Stripe, Linear,
    // GitHub settings all do this) — the mismatch was never "header wide,
    // body narrow," it was "body narrow AND left-aligned instead of
    // centered."
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Prospects</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
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
            {usingCredits && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                <Sparkles className="size-3.5 shrink-0" />
                Monthly allowance used — {purchasedCredits} purchased prospect{purchasedCredits === 1 ? "" : "s"} available and will be
                used automatically.
              </p>
            )}
            {atLimit && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="size-3.5 shrink-0" />
                Monthly limit reached —{" "}
                <Link href="/studio/billing" className="underline hover:text-destructive/80">
                  buy more prospects or upgrade your plan
                </Link>{" "}
                to keep finding prospects this month.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <button
            type="button"
            onClick={() => setNicheOpen((o) => !o)}
            aria-expanded={nicheOpen}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">Your niche</p>
              {!nicheOpen && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {categories || "No categories set"} · {areas || "No areas set"}
                </p>
              )}
            </div>
            {nicheOpen ? (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {nicheOpen && (
            <>
          <p className="mt-4 font-heading text-sm font-semibold">Describe your ideal customer</p>
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

          <p className="mt-5 font-heading text-sm font-semibold">Categories &amp; areas</p>
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
            </>
          )}
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

      {runResult && <DiscoveryResultMessage result={runResult} />}

      {/* Search now — a real, immediate search for one location (category
          optional), separate from the niche above. "Find prospects now"
          re-runs your *saved* categories/areas through a weekly rotation
          (a few pairs at a time); it can't target one specific place on
          demand, and there was no way to search by location alone. This
          calls searchProspects() directly — one real search, right now,
          for exactly what's typed here — and doesn't touch or require
          the saved niche at all. */}
      <Card>
        <CardContent>
          <p className="flex items-center gap-1.5 font-heading text-sm font-semibold">
            <Search className="size-4 text-accent" /> Search now
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            One immediate search for a specific place — category is optional. Doesn&apos;t change your saved niche
            above.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="search-location" className="text-xs">
                <MapPin className="size-3" /> Location
              </Label>
              <Input
                id="search-location"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="e.g. Manchester"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-category" className="text-xs">
                <Tag className="size-3" /> Category <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="search-category"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                placeholder="e.g. Gyms — leave blank for any business"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={searchPending || atLimit || !searchLocation.trim()}
            className="mt-4 w-full sm:w-auto"
          >
            {searchPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Searching…
              </>
            ) : (
              <>
                <Search className="size-4" /> Search now
              </>
            )}
          </Button>
          {searchResult && (
            <div className="mt-3">
              <DiscoveryResultMessage result={searchResult} />
            </div>
          )}
        </CardContent>
      </Card>

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
                aria-label="Filter by status"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All statuses</option>
                <option value="needs_verification">Needs verification</option>
                <option value="qualified">Qualified</option>
                <option value="contacted">Contacted</option>
                <option value="needs_followup">Follow-up due</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort prospects by"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="score">Highest score</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
              </select>
              {teamMembers.length > 1 && (
                <Button size="sm" variant={mineOnly ? "secondary" : "ghost"} onClick={() => setMineOnly((v) => !v)}>
                  Assigned to me
                </Button>
              )}
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
          <>
            {/* Studio improvement — bulk actions. Only shown once there's a
                real list to select from (visibleProspects.length > 0 is
                already guaranteed by this branch); the bar itself only
                appears once something's actually selected, same "don't
                show controls for a state that isn't real yet" rule as the
                rest of this page. */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                aria-label="Select all visible prospects"
                className="size-4 shrink-0 rounded border-border accent-accent"
              />
              <span>Select all {visibleProspects.length}</span>
              {selected.size > 0 && (
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  <span>{selected.size} selected</span>
                  <Button size="xs" variant="outline" disabled={bulkPending} onClick={bulkMarkContacted}>
                    {bulkPending ? "Updating…" : `Mark ${selected.size} as contacted`}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={kitsPending || selected.size > MAX_BULK_KITS}
                    onClick={bulkGenerateKits}
                    title={selected.size > MAX_BULK_KITS ? `Select ${MAX_BULK_KITS} or fewer to generate kits in bulk` : undefined}
                  >
                    {kitsPending
                      ? kitsProgress
                        ? `Generating ${kitsProgress.done}/${kitsProgress.total}…`
                        : "Generating…"
                      : `Generate ${Math.min(selected.size, MAX_BULK_KITS)} outreach kit${Math.min(selected.size, MAX_BULK_KITS) === 1 ? "" : "s"}`}
                  </Button>
                </span>
              )}
            </div>
            {selected.size > MAX_BULK_KITS && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Only the first {MAX_BULK_KITS} selected can have outreach kits generated at once — real AI calls, one per prospect.
              </p>
            )}
            {bulkDone !== null && !bulkPending && (
              <p className="mt-1.5 text-xs text-accent">
                {bulkDone} prospect{bulkDone === 1 ? "" : "s"} marked as contacted.
              </p>
            )}
            {bulkError && <p className="mt-1.5 text-xs text-destructive">{bulkError}</p>}
            {kitsDone !== null && !kitsPending && (
              <p className="mt-1.5 text-xs text-accent">
                {kitsDone} outreach kit{kitsDone === 1 ? "" : "s"} generated.
              </p>
            )}
            {kitsError && <p className="mt-1.5 text-xs text-destructive">{kitsError}</p>}
            <div className="mt-2 space-y-2">
              {visibleProspects.map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  selected={selected.has(p.id)}
                  onToggleSelect={() => toggleSelected(p.id)}
                  bookingLink={bookingLink}
                  proposalToken={latestProposalByProspect.get(p.id) ?? null}
                  teamMembers={teamMembers}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
