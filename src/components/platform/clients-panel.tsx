"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Receipt,
  CircleAlert,
  LoaderCircle,
  Trash2,
  HeartPulse,
  ShieldAlert,
  FileText,
  MessageCircle,
  Copy,
  Check,
  Search,
  Radar,
  Repeat,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createClientInvoice,
  deleteClientData,
  generateClientReportNow,
  updateChatbotEmbedConfig,
  updateClientMaintenanceRate,
  startClientSubscription,
  cancelClientSubscription,
  inviteClientMemberAction,
  removeClientMemberAction,
} from "@/app/studio/(authed)/clients/actions";
import type { ClientHealth } from "@/lib/client-health";
import type { ClientEngagementRisk } from "@/lib/studio-engagement";
import { StudioPageHeader } from "@/components/platform/studio-page-header";

type Client = {
  id: string;
  business_name: string;
  email: string | null;
  website_url: string | null;
  maintenance_plan: string | null;
  created_at: string;
  chatbot_embed_enabled: boolean;
  chatbot_embed_allowed_origin: string | null;
  maintenance_monthly_pence: number | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
};

// Same shared inline-<select> chrome as requests-panel.tsx/
// projects-panel.tsx/prospecting-panel.tsx's own selectClasses.
const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Invoice = {
  id: string;
  client_id: string;
  amount_pence: number;
  description: string;
  status: string;
  due_date: string | null;
  stripe_hosted_invoice_url: string | null;
  created_at: string;
};

const invoiceStatusVariant: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  open: "warning",
  paid: "success",
  void: "secondary",
  uncollectible: "destructive",
};

function formatMoney(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

// Client health score (P1 platform readiness item) — same thresholds as
// the client portal's own presentation of this number, just applied
// here so an agency owner scanning their whole client list can spot who
// needs attention without opening each portal individually. "No data
// yet" (null) is a real, distinct state — not a fabricated 0 — for a
// brand-new client with no requests, invoices, or uptime checks yet.
function healthBadgeVariant(score: number | null): "success" | "warning" | "destructive" | "secondary" {
  if (score === null) return "secondary";
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}

function HealthBadge({ health }: { health: ClientHealth | undefined }) {
  const score = health?.healthScore ?? null;
  return (
    <Badge variant={healthBadgeVariant(score)} className="gap-1">
      <HeartPulse className="size-3" />
      {score === null ? "No data yet" : `${score}%`}
    </Badge>
  );
}

// Engagement risk badge — same computeClientEngagementRisk() (studio-
// engagement.ts) already driving the Command Centre's own Engagement risk
// card, just surfaced per-client here too. A client with no risk entry
// (the common case) gets no badge at all, not a green "all clear" one —
// same "only show it when it's real" rule the health badge already
// follows with its "No data yet" state.
// Roadmap item #3 — early_warning (a genuine leading indicator: contact
// frequency dropping, before either threshold trips) gets its own
// deliberately quieter badge, same reasoning as command-centre-section-
// cards.tsx's TIER_BADGE_CLASS: styling it identically to an active
// warning would be alarm fatigue for something that's still just a trend.
function RiskBadge({ risk }: { risk: ClientEngagementRisk | undefined }) {
  if (!risk) return null;
  const variant = risk.tier === "critical" ? "destructive" : risk.tier === "warning" ? "warning" : "secondary";
  const label = risk.tier === "critical" ? "At risk" : risk.tier === "warning" ? "Worth a check-in" : "Trending down";
  return (
    <Badge variant={variant} className="gap-1">
      <ShieldAlert className="size-3" />
      {label}
    </Badge>
  );
}

function InvoiceForm({ clientId }: { clientId: string }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  function submit() {
    setError(null);
    setSentUrl(null);
    startTransition(async () => {
      const r = await createClientInvoice(clientId, parseFloat(amount), description);
      if ("error" in r) {
        setError(r.error ?? "Failed to create the invoice.");
        return;
      }
      setAmount("");
      setDescription("");
      setSentUrl(r.invoiceUrl ?? null);
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-semibold text-muted-foreground">New invoice</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
        <div>
          <Label htmlFor={`amount-${clientId}`} className="text-xs">
            Amount (£)
          </Label>
          <Input
            id={`amount-${clientId}`}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
            placeholder="500.00"
          />
        </div>
        <div>
          <Label htmlFor={`desc-${clientId}`} className="text-xs">
            What&apos;s it for
          </Label>
          <Input
            id={`desc-${clientId}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
            placeholder="AI Business Analytics — August"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={submit}>
          {pending ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Receipt className="size-3.5" /> Create &amp; send
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5 shrink-0" /> {error}
        </p>
      )}
      {sentUrl && (
        <p className="mt-2 text-xs text-accent">
          Invoice sent —{" "}
          <a href={sentUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            view it
          </a>
          .
        </p>
      )}
    </div>
  );
}

const subscriptionStatusVariant: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  active: "success",
  past_due: "warning",
  canceled: "secondary",
  incomplete: "warning",
  incomplete_expired: "destructive",
  unpaid: "destructive",
};

// Studio big-ticket ("recurring client billing for tenants") — the same
// startSubscription()/cancelSubscription() (subscription.ts) /admin's own
// clients already use, now reachable from a tenant's own Clients page.
// Three small pieces of state to show: the rate itself (editable any
// time — Stripe only reads it the moment a subscription starts, same as
// admin's own updateMaintenanceRate()), whether a subscription is
// running, and its real status once it is. A rate can be set with no
// subscription running yet (same as admin) — the two are deliberately
// decoupled, since deciding the price and deciding to actually start
// billing are two different moments.
function MaintenanceSubscriptionControl({ client }: { client: Client }) {
  const [rateInput, setRateInput] = useState(client.maintenance_monthly_pence ? (client.maintenance_monthly_pence / 100).toFixed(2) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveRate() {
    setError(null);
    startTransition(async () => {
      const r = await updateClientMaintenanceRate(client.id, parseFloat(rateInput));
      if (r && "error" in r) setError(r.error ?? "Failed to save.");
    });
  }

  function start() {
    setError(null);
    startTransition(async () => {
      const r = await startClientSubscription(client.id);
      if (r && "error" in r) setError(r.error ?? "Failed to start the subscription.");
    });
  }

  function cancel() {
    setError(null);
    startTransition(async () => {
      const r = await cancelClientSubscription(client.id);
      if (r && "error" in r) setError(r.error ?? "Failed to cancel the subscription.");
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Repeat className="size-3.5 shrink-0" /> Recurring maintenance
        </p>
        {client.stripe_subscription_id && client.subscription_status && (
          <Badge variant={subscriptionStatusVariant[client.subscription_status] ?? "secondary"} className="capitalize">
            {client.subscription_status.replace("_", " ")}
          </Badge>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Label htmlFor={`rate-${client.id}`} className="text-xs whitespace-nowrap">
          £/month
        </Label>
        <Input
          id={`rate-${client.id}`}
          type="number"
          min="0"
          step="0.01"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="h-8 w-28 text-sm"
          placeholder="150.00"
        />
        <Button size="sm" variant="outline" disabled={pending || !rateInput} onClick={saveRate}>
          Save rate
        </Button>
        {client.stripe_subscription_id ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={cancel} className="text-destructive">
            Cancel subscription
          </Button>
        ) : (
          <Button size="sm" disabled={pending || !client.maintenance_monthly_pence} onClick={start}>
            Start subscription
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// GDPR erasure control — type-to-confirm rather than the lighter two-step
// pattern used elsewhere (RemoveProspectControl): this permanently
// deletes real personal data across several tables, not a prospect
// record that was never a live client relationship. Matching the weight
// of the action to the weight of the confirmation.
function DeleteClientControl({ client }: { client: Client }) {
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
        <Trash2 className="size-3.5" /> Delete this client&apos;s data
      </Button>
    );
  }

  const nameMatches = typedName.trim() === client.business_name;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs font-medium text-destructive">
        This permanently deletes {client.business_name}&apos;s data — invoices, requests, portal access, everything.
        There&apos;s no undo.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Type <span className="font-mono font-medium text-foreground">{client.business_name}</span> to confirm.
      </p>
      <Input
        value={typedName}
        onChange={(e) => setTypedName(e.target.value)}
        className="mt-2 h-8 text-sm"
        autoFocus
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={!nameMatches || pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await deleteClientData(client.id);
              if (r && "error" in r) setError(r.error ?? "Failed to delete.");
            })
          }
        >
          {pending ? "Deleting…" : "Permanently delete"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// P1 platform readiness item — same function the monthly cron calls
// (monthly-report.ts), triggered on demand so an agency owner doesn't have
// to wait for month-end to see their first report.
function GenerateReportControl({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function generate() {
    setMessage(null);
    startTransition(async () => {
      const r = await generateClientReportNow(clientId);
      if (r && "error" in r) {
        setMessage({ text: r.error ?? "Failed to generate the report.", ok: false });
        return;
      }
      setMessage({ text: "Generated — visible in their portal now.", ok: true });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={generate}>
        <FileText className="size-3.5" /> {pending ? "Generating…" : "Generate this month's report"}
      </Button>
      {message && <span className={`text-xs ${message.ok ? "text-accent" : "text-destructive"}`}>{message.text}</span>}
    </div>
  );
}

// Phase 3 of "sell a chatbot to your client's own website" — the Studio
// toggle + embed snippet. Uses window.location.origin rather than a
// hardcoded domain for the snippet, so this keeps working correctly
// regardless of what domain Studio itself is ever served from.
// Studio big-ticket ("client portal self-serve team management") — the
// admin equivalent (/admin/(authed)/clients/[id]/page.tsx's own "Team"
// section) has existed since Phase 1, for HamishAI's own clients only.
// Same list-plus-invite-form shape, ported to a tenant's own clients.
type ClientMember = { id: string; email: string; role: "owner" | "member"; accepted_at: string | null };

function ClientMembersControl({ client, members }: { client: Client; members: ClientMember[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "member">("member");
  const [invitePending, startInvite] = useTransition();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removePending, startRemove] = useTransition();

  function invite() {
    setInviteError(null);
    startInvite(async () => {
      const r = await inviteClientMemberAction(client.id, email, role);
      if (r && "error" in r) {
        setInviteError(r.error ?? "Failed to invite that person.");
        return;
      }
      setEmail("");
    });
  }

  function remove(memberId: string) {
    startRemove(async () => {
      await removeClientMemberAction(memberId);
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Users className="size-3.5 shrink-0" /> Portal access
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Anyone listed here can sign in at{" "}
        <Link href="/portal/login" className="text-accent underline underline-offset-2">
          /portal/login
        </Link>{" "}
        with their own email — no shared password, no account to create.
      </p>

      {members.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs">
              <div>
                <span className="font-medium">{m.email}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {m.role === "owner" ? "Owner" : "Member"} · {m.accepted_at ? "Active" : "Invited"}
                </span>
              </div>
              <Button size="xs" variant="ghost" disabled={removePending} onClick={() => remove(m.id)} aria-label={`Remove ${m.email}`}>
                <Trash2 className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex flex-wrap items-end gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="name@business.com"
          className="h-8 min-w-[160px] flex-1 text-sm"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as "owner" | "member")} className={selectClasses}>
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
        <Button size="sm" variant="outline" disabled={invitePending || !email.trim()} onClick={invite}>
          Invite
        </Button>
      </div>
      {inviteError && <p className="mt-1.5 text-xs text-destructive">{inviteError}</p>}
    </div>
  );
}

function EmbedChatbotControl({ client, usageCount, leads }: { client: Client; usageCount: number; leads: EmbedLead[] }) {
  const [enabled, setEnabled] = useState(client.chatbot_embed_enabled);
  const [origin, setOrigin] = useState(client.chatbot_embed_allowed_origin ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${appOrigin}/api/embed/widget" data-client="${client.id}" async></script>`;

  function save(nextEnabled: boolean) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await updateChatbotEmbedConfig(client.id, nextEnabled, origin);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to save.");
        return;
      }
      setEnabled(nextEnabled);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <MessageCircle className="size-3.5 shrink-0" /> Chatbot for their website
        </p>
        {client.chatbot_embed_enabled && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {usageCount} message{usageCount === 1 ? "" : "s"} · last 30 days
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        A real feature you can sell as part of what you deliver — visitors on your client&apos;s own website get
        instant, accurate answers, day or night.
      </p>

      <ol className="mt-3 space-y-2.5 text-xs">
        <li className="flex gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-semibold text-accent">
            1
          </span>
          <span className="text-muted-foreground">
            Add what it should know in{" "}
            <Link href="/studio/knowledge" className="text-accent underline underline-offset-2">
              Knowledge base
            </Link>{" "}
            — opening hours, policies, services. It never answers from account or order data, only these facts.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-semibold text-accent">
            2
          </span>
          <div className="flex-1 space-y-2 text-muted-foreground">
            <span>Enter their website and turn it on:</span>
            <div className="flex items-center gap-2">
              <Input
                id={`embed-origin-${client.id}`}
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setSaved(false);
                }}
                placeholder="https://theirsite.com"
                className="h-8 text-sm"
              />
              <Button size="sm" variant={enabled ? "outline" : "default"} disabled={pending} onClick={() => save(!enabled)}>
                {pending ? "Saving…" : enabled ? "Disable" : "Enable"}
              </Button>
            </div>
            {saved && <span className="block text-accent">Saved.</span>}
            {error && <span className="block text-destructive">{error}</span>}
          </div>
        </li>
        <li className="flex gap-2">
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
              enabled && client.chatbot_embed_allowed_origin ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
            }`}
          >
            3
          </span>
          <span className="text-muted-foreground">
            Copy the snippet below and send it to whoever manages their site — them, their web developer, or you.
          </span>
        </li>
        <li className="flex gap-2">
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
              usageCount > 0 ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
            }`}
          >
            4
          </span>
          <span className="text-muted-foreground">
            {usageCount > 0
              ? `It's live and being used — ${usageCount} real conversation${usageCount === 1 ? "" : "s"} in the last 30 days.`
              : "Once pasted onto their site, it's live — real usage shows up here once visitors start asking it questions."}
          </span>
        </li>
      </ol>

      {/* Studio big-ticket #6 ("embedded chatbot has no lead-capture path")
          — a visitor who the bot couldn't answer can now leave contact
          info instead of the interaction just dropping on the floor.
          Only rendered once there's actually one — no empty "0 leads"
          noise on a client whose chatbot's never generated one. */}
      {leads.length > 0 && (
        <div className="mt-3 rounded-lg border border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Mail className="size-3.5 shrink-0 text-muted-foreground" /> {leads.length} lead{leads.length === 1 ? "" : "s"} captured
          </p>
          <ul className="mt-2 space-y-1.5">
            {leads.slice(0, 5).map((lead) => (
              <li key={lead.id} className="text-xs">
                <span className="font-medium">{lead.email}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                {lead.message && <p className="mt-0.5 text-muted-foreground">{lead.message}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enabled && client.chatbot_embed_allowed_origin && (
        <div className="mt-3 rounded-lg border border-dashed border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Give this to whoever manages their website</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground hover:text-accent"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="mt-1.5 block overflow-x-auto rounded bg-secondary/60 px-2 py-1.5 text-[11px]">{snippet}</code>
        </div>
      )}
    </div>
  );
}

type CompetitorIntel = { headline: string; detail: string; sourceUrl: string | null; createdAt: string };

// Studio big-ticket #6 ("embedded chatbot has no lead-capture path").
type EmbedLead = { id: string; email: string; message: string | null; created_at: string };

function ClientCard({
  client,
  invoices,
  health,
  risk,
  embedUsage,
  embedLeads,
  members,
  stripeReady,
  competitorIntel,
}: {
  client: Client;
  invoices: Invoice[];
  health: ClientHealth | undefined;
  risk: ClientEngagementRisk | undefined;
  embedUsage: number;
  embedLeads: EmbedLead[];
  members: ClientMember[];
  stripeReady: boolean;
  competitorIntel: CompetitorIntel[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-heading text-sm font-semibold text-accent uppercase">
              {client.business_name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{client.business_name}</p>
              <p className="truncate text-xs text-muted-foreground">{client.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <RiskBadge risk={risk} />
            <HealthBadge health={health} />
            {/* Studio improvement — the per-client AI chatbot detail
                (EmbedChatbotControl, below) only exists inside the
                expanded card, so scanning "who has AI enabled" across a
                client list meant opening every single row. This is the
                same real client.chatbot_embed_enabled flag, just
                surfaced one level up. */}
            {client.chatbot_embed_enabled && (
              <Badge variant="ai" className="hidden gap-1 sm:inline-flex">
                <MessageCircle className="size-3" /> AI chatbot
              </Badge>
            )}
            {client.website_url && (
              <a
                href={client.website_url.startsWith("http") ? client.website_url : `https://${client.website_url}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hidden items-center gap-1 text-xs text-accent hover:underline sm:flex"
              >
                <ExternalLink className="size-3" />
                Website
              </a>
            )}
            {client.maintenance_plan && client.maintenance_plan !== "none" && (
              <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                {client.maintenance_plan}
              </Badge>
            )}
            <p className="font-mono text-[11px] text-muted-foreground">
              {new Date(client.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {risk && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ShieldAlert className="size-3.5 shrink-0 text-destructive" /> Engagement risk
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {risk.quietWeeks > 0 && `Quiet ${risk.quietWeeks} week${risk.quietWeeks === 1 ? "" : "s"}`}
                  {risk.quietWeeks > 0 && risk.hasOverdueInvoice && " · "}
                  {risk.hasOverdueInvoice && "Invoice overdue"}
                </p>
              </div>
            )}

            {health && health.components.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <HeartPulse className="size-3.5 shrink-0" /> Health score
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {health.components.map((c) => (
                    <p key={c.label} className="font-mono text-[11px] text-muted-foreground">
                      {c.label}: <span className="text-foreground">{c.value}%</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Roadmap item #7 — only ever real findings a monthly
                background pass actually confirmed (competitor-intel.ts);
                nothing renders here for a client with none yet, same
                "only show it when it's real" rule as every other section
                on this card. */}
            {competitorIntel.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Radar className="size-3.5 shrink-0" /> Competitive intel
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {competitorIntel.map((intel, i) => (
                    <div key={i} className="rounded-lg border border-border px-3 py-2 text-xs">
                      <p className="font-medium">{intel.headline}</p>
                      <p className="mt-0.5 text-muted-foreground">{intel.detail}</p>
                      {intel.sourceUrl && (
                        <a href={intel.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-accent hover:underline">
                          <ExternalLink className="size-3" /> Source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <GenerateReportControl clientId={client.id} />

            <ClientMembersControl client={client} members={members} />

            <EmbedChatbotControl client={client} usageCount={embedUsage} leads={embedLeads} />

            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Receipt className="size-3.5 shrink-0" /> Invoices
            </p>

            {invoices.length > 0 && (
              <div className="space-y-1.5">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{inv.description}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {inv.due_date && ` · due ${new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs">{formatMoney(inv.amount_pence)}</span>
                      <Badge variant={invoiceStatusVariant[inv.status] ?? "secondary"} className="capitalize">
                        {inv.status}
                      </Badge>
                      {inv.stripe_hosted_invoice_url && (
                        <a href={inv.stripe_hosted_invoice_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stripeReady ? (
              <>
                <InvoiceForm clientId={client.id} />
                <MaintenanceSubscriptionControl client={client} />
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Connect Stripe in{" "}
                <Link href="/studio/settings" className="text-accent underline underline-offset-2">
                  Settings
                </Link>{" "}
                before you can invoice this client.
              </p>
            )}

            <div className="flex justify-end border-t border-border pt-3">
              <DeleteClientControl client={client} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Critical first, then warning, then everyone else — same weighting
// computeClientEngagementRisk() itself uses to order the dashboard's own
// Engagement risk card. Array.prototype.sort is stable in every engine
// this app runs on (V8, spec-guaranteed since ES2019), so clients within
// the same tier (including "no risk at all") keep the created_at-desc
// order the page query already sorted them in — this only ever reorders
// across tiers, never within one.
const RISK_TIER_WEIGHT: Record<string, number> = { critical: 3, warning: 2, early_warning: 1 };

export function ClientsPanel({
  clients,
  invoicesByClient,
  healthByClient,
  riskByClient,
  embedUsageByClient,
  embedLeadsByClient,
  membersByClient,
  competitorIntelByClient,
  stripeReady,
}: {
  clients: Client[];
  invoicesByClient: Record<string, Invoice[]>;
  healthByClient: Record<string, ClientHealth>;
  riskByClient: Record<string, ClientEngagementRisk>;
  embedUsageByClient: Record<string, number>;
  embedLeadsByClient: Record<string, EmbedLead[]>;
  membersByClient: Record<string, ClientMember[]>;
  competitorIntelByClient: Record<string, CompetitorIntel[]>;
  stripeReady: boolean;
}) {
  const riskCount = Object.keys(riskByClient).length;
  const sortedClients = [...clients].sort(
    (a, b) => (RISK_TIER_WEIGHT[riskByClient[b.id]?.tier ?? ""] ?? 0) - (RISK_TIER_WEIGHT[riskByClient[a.id]?.tier ?? ""] ?? 0)
  );

  // Studio improvement — client-side, same pattern prospecting-panel.tsx's
  // own search already uses. Filters, doesn't replace, the risk-tier
  // sort above — a search result still surfaces an at-risk match first.
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const visibleClients = searchLower
    ? sortedClients.filter((c) => c.business_name.toLowerCase().includes(searchLower) || (c.email ?? "").toLowerCase().includes(searchLower))
    : sortedClients;

  return (
    <div className="mx-auto max-w-4xl">
      <StudioPageHeader
        eyebrow="Deliver"
        title="Clients"
        description={
          <>
            Everyone you&apos;ve converted from a prospect. Each one gets their own portal login at{" "}
            <span className="font-mono text-xs">hamishai.org/portal</span>, branded to your agency.
          </>
        }
      />

      {clients.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No clients yet — convert a prospect from{" "}
            <Link href="/studio/prospects" className="text-accent underline underline-offset-2">
              Prospects
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{clients.length}</span> client
            {clients.length === 1 ? "" : "s"}
            {riskCount > 0 && (
              <>
                {" · "}
                <span className="font-mono font-semibold text-destructive">{riskCount}</span>{" "}
                <span className="text-destructive">may need a check-in — sorted to the top</span>
              </>
            )}
          </p>
          {clients.length > 4 && (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="pl-8" />
            </div>
          )}
          {visibleClients.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No clients match that search.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleClients.map((c) => (
                <ClientCard
                  key={c.id}
                  client={c}
                  invoices={invoicesByClient[c.id] ?? []}
                  health={healthByClient[c.id]}
                  risk={riskByClient[c.id]}
                  embedUsage={embedUsageByClient[c.id] ?? 0}
                  embedLeads={embedLeadsByClient[c.id] ?? []}
                  members={membersByClient[c.id] ?? []}
                  competitorIntel={competitorIntelByClient[c.id] ?? []}
                  stripeReady={stripeReady}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
