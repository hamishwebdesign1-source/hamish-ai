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
} from "@/app/studio/(authed)/clients/actions";
import type { ClientHealth } from "@/lib/client-health";
import type { ClientEngagementRisk } from "@/lib/studio-engagement";
import { ClientsCopilot } from "@/components/platform/clients-copilot";

type Client = {
  id: string;
  business_name: string;
  email: string | null;
  website_url: string | null;
  maintenance_plan: string | null;
  created_at: string;
  chatbot_embed_enabled: boolean;
  chatbot_embed_allowed_origin: string | null;
};

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
function RiskBadge({ risk }: { risk: ClientEngagementRisk | undefined }) {
  if (!risk) return null;
  return (
    <Badge variant={risk.tier === "critical" ? "destructive" : "warning"} className="gap-1">
      <ShieldAlert className="size-3" />
      {risk.tier === "critical" ? "At risk" : "Worth a check-in"}
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
function EmbedChatbotControl({ client, usageCount }: { client: Client; usageCount: number }) {
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

function ClientCard({
  client,
  invoices,
  health,
  risk,
  embedUsage,
  stripeReady,
}: {
  client: Client;
  invoices: Invoice[];
  health: ClientHealth | undefined;
  risk: ClientEngagementRisk | undefined;
  embedUsage: number;
  stripeReady: boolean;
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

            <GenerateReportControl clientId={client.id} />

            <EmbedChatbotControl client={client} usageCount={embedUsage} />

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
              <InvoiceForm clientId={client.id} />
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
const RISK_TIER_WEIGHT: Record<string, number> = { critical: 2, warning: 1 };

export function ClientsPanel({
  clients,
  invoicesByClient,
  healthByClient,
  riskByClient,
  embedUsageByClient,
  stripeReady,
}: {
  clients: Client[];
  invoicesByClient: Record<string, Invoice[]>;
  healthByClient: Record<string, ClientHealth>;
  riskByClient: Record<string, ClientEngagementRisk>;
  embedUsageByClient: Record<string, number>;
  stripeReady: boolean;
}) {
  const riskCount = Object.keys(riskByClient).length;
  const sortedClients = [...clients].sort(
    (a, b) => (RISK_TIER_WEIGHT[riskByClient[b.id]?.tier ?? ""] ?? 0) - (RISK_TIER_WEIGHT[riskByClient[a.id]?.tier ?? ""] ?? 0)
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone you&apos;ve converted from a prospect. Each one gets their own portal login at{" "}
        <span className="font-mono text-xs">hamishai.org/portal</span>, branded to your agency.
      </p>

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
          <div className="mt-3">
            <ClientsCopilot />
          </div>
          <div className="mt-3 space-y-2">
            {sortedClients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                invoices={invoicesByClient[c.id] ?? []}
                health={healthByClient[c.id]}
                risk={riskByClient[c.id]}
                embedUsage={embedUsageByClient[c.id] ?? 0}
                stripeReady={stripeReady}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
