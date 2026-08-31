"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Megaphone, Plus, Target, X, Trash2, CircleAlert, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, updateCampaignStatus, assignProspectToCampaign, deleteCampaign } from "@/app/studio/(authed)/campaigns/actions";

type Campaign = { id: string; name: string; objective: string | null; status: string; created_at: string };
type Prospect = {
  id: string;
  business_name: string;
  campaign_id: string | null;
  status: string;
  deal_value_pence: number | null;
  contacted_at: string | null;
};

const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Studio improvement — campaign staleness. STALE_DAYS gives a new
// campaign a real grace period before it can be flagged, same "give it
// real time before judging it" instinct as projects-panel.tsx's own
// DUE_SOON_DAYS. daysSince kept as a plain module-scope function, not
// inline in CampaignCard's own render body — same react-hooks/purity
// reasoning documented at billing/page.tsx's own daysUntil(): Date.now()
// called directly during a component's render is flagged, a plain
// function the component merely invokes isn't.
const STALE_DAYS = 14;
function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function NewCampaignForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> New campaign
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createCampaign(name, objective);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to create.");
        return;
      }
      setName("");
      setObjective("");
      setOpen(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div>
          <Label htmlFor="campaign-name" className="text-xs">
            Campaign name
          </Label>
          <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Autumn Edinburgh push" autoFocus />
        </div>
        <div>
          <Label htmlFor="campaign-objective" className="text-xs">
            Objective (optional)
          </Label>
          <Textarea
            id="campaign-objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            placeholder="Find 20 qualified hospitality leads in the New Town area."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending || !name.trim()} onClick={submit}>
            {pending ? "Creating…" : "Create campaign"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

// Real-improvement pass — assignProspectToCampaign already supported
// clearing a prospect back to unassigned (campaignId: null), but nothing
// in this UI ever called it that way, and a campaign's assigned
// prospects were never listed here at all — only a count. Once added, a
// prospect was stuck, with no way to see who was actually in a campaign
// or move them back out.
function AssignedProspectRow({ prospect }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await assignProspectToCampaign(prospect.id, null);
      if (r && "error" in r) setError(r.error ?? "Failed to update — try again.");
    });
  }

  return (
    <div className="py-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate">{prospect.business_name}</span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={`Remove ${prospect.business_name} from this campaign`}
          disabled={pending}
          onClick={remove}
        >
          <X className="size-3" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AddProspectControl({ campaignId, unassigned }: { campaignId: string; unassigned: Prospect[] }) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (unassigned.length === 0) return null;

  function add() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const r = await assignProspectToCampaign(selected, campaignId);
      if (r && "error" in r) {
        setError(r.error ?? "Failed to update — try again.");
        return;
      }
      setSelected("");
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Add a prospect to this campaign"
          className={selectClasses}
        >
          <option value="">Add a prospect…</option>
          {unassigned.map((p) => (
            <option key={p.id} value={p.id}>
              {p.business_name}
            </option>
          ))}
        </select>
        <Button size="xs" variant="outline" disabled={!selected || pending} onClick={add}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CampaignCard({ campaign, prospects, unassigned }: { campaign: Campaign; prospects: Prospect[]; unassigned: Prospect[] }) {
  const [status, setStatus] = useState(campaign.status);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  const converted = prospects.filter((p) => p.status === "converted").length;
  const conversionRate = prospects.length > 0 ? Math.round((converted / prospects.length) * 100) : null;
  // Studio improvement — the same tenant-entered deal_value_pence
  // prospecting-panel.tsx already sums for the Command Centre's overall
  // pipeline stat (page.tsx's own pipelineValuePence), just scoped to
  // this one campaign's prospects. Only over prospects still active (not
  // yet won or lost) — matches page.tsx's own .not("status", "in",
  // "(converted,lost)") filter, so a campaign's pipeline figure means
  // the same thing here as it does on the Command Centre.
  const pipelineValuePence = prospects
    .filter((p) => p.status !== "converted" && p.status !== "lost")
    .reduce((sum, p) => sum + (p.deal_value_pence ?? 0), 0);

  // Studio improvement — a different angle from studio-engagement.ts's
  // own per-client engagement risk (which never looks at campaigns at
  // all): a campaign left "active" for a while with genuinely zero real
  // contact activity across its prospects. STALE_DAYS gives a new
  // campaign a real grace period before it can be flagged — matches the
  // same "give it real time before judging it" instinct as
  // projects-panel.tsx's own DUE_SOON_DAYS.
  const mostRecentContact = prospects.reduce<string | null>((latest, p) => {
    if (!p.contacted_at) return latest;
    return !latest || p.contacted_at > latest ? p.contacted_at : latest;
  }, null);
  const isStale =
    status === "active" &&
    prospects.length > 0 &&
    daysSince(campaign.created_at) >= STALE_DAYS &&
    (!mostRecentContact || daysSince(mostRecentContact) >= STALE_DAYS);

  function toggleStatus() {
    const next = status === "completed" ? "active" : "completed";
    setStatus(next);
    startTransition(async () => {
      const r = await updateCampaignStatus(campaign.id, next);
      if (r && "error" in r) setStatus(campaign.status);
    });
  }

  function remove() {
    startDeleteTransition(async () => {
      const r = await deleteCampaign(campaign.id);
      if (r && "error" in r) {
        setConfirmingDelete(false);
        return;
      }
      setDeleted(true);
    });
  }

  // revalidatePath re-fetches server data but doesn't unmount an already-
  // rendered client card mid-transition — hide it immediately on success
  // rather than leaving a just-deleted campaign visible until the next
  // full navigation.
  if (deleted) return null;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{campaign.name}</p>
            {campaign.objective && <p className="mt-0.5 text-xs text-muted-foreground">{campaign.objective}</p>}
            {isStale && (
              <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                <CircleAlert className="size-3 shrink-0" />
                Active {Math.floor(daysSince(campaign.created_at))} days with no real contact activity
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={status === "completed" ? "secondary" : "accent"}>{status === "completed" ? "Completed" : "Active"}</Badge>
            <Button size="xs" variant="ghost" disabled={pending} onClick={toggleStatus}>
              {status === "completed" ? "Reopen" : "Mark completed"}
            </Button>
            {confirmingDelete ? (
              <>
                <Button size="xs" variant="destructive" disabled={deletePending} onClick={remove}>
                  {deletePending ? "…" : "Confirm"}
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label="Cancel delete" onClick={() => setConfirmingDelete(false)}>
                  <X className="size-3" />
                </Button>
              </>
            ) : (
              <Button size="icon-xs" variant="ghost" aria-label="Delete campaign" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <span>{prospects.length} prospect{prospects.length === 1 ? "" : "s"}</span>
          <span>{converted} converted</span>
          {conversionRate !== null ? <span>{conversionRate}% conversion</span> : <span>No data yet</span>}
          {pipelineValuePence > 0 && <span>£{Math.round(pipelineValuePence / 100).toLocaleString("en-GB")} pipeline</span>}
        </div>
        {prospects.length > 0 && (
          <div className="mt-2 divide-y divide-border border-t border-border">
            {prospects.map((p) => (
              <AssignedProspectRow key={p.id} prospect={p} />
            ))}
          </div>
        )}
        {status !== "completed" && <AddProspectControl campaignId={campaign.id} unassigned={unassigned} />}
      </CardContent>
    </Card>
  );
}

export function CampaignsPanel({ campaigns, prospects }: { campaigns: Campaign[]; prospects: Prospect[] }) {
  const prospectsByCampaign = new Map<string, Prospect[]>();
  for (const p of prospects) {
    if (!p.campaign_id) continue;
    const list = prospectsByCampaign.get(p.campaign_id) ?? [];
    list.push(p);
    prospectsByCampaign.set(p.campaign_id, list);
  }
  const unassigned = prospects.filter((p) => !p.campaign_id);

  // Studio improvement — same client-side search pattern as every other
  // panel this session (clients/requests/projects/knowledge). Campaigns
  // are typically fewer than those lists, so this only shows once there
  // are enough to actually need narrowing.
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();
  const visibleCampaigns = searchLower
    ? campaigns.filter((c) => c.name.toLowerCase().includes(searchLower) || (c.objective ?? "").toLowerCase().includes(searchLower))
    : campaigns;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold md:text-3xl">Campaigns</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Group your prospecting under a named push and see real results — add prospects to a campaign right from its
        card below. Find more in{" "}
        <Link href="/studio/prospects" className="text-accent underline underline-offset-2">
          Prospects
        </Link>
        .
      </p>

      <div className="mt-6">
        <NewCampaignForm />
      </div>

      {campaigns.length > 4 && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns…" className="pl-8" />
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <Megaphone className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No campaigns yet — create one, then assign prospects to it as you find them.
          </p>
        </div>
      ) : visibleCampaigns.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No campaigns match that search.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleCampaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} prospects={prospectsByCampaign.get(c.id) ?? []} unassigned={unassigned} />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        <Target className="size-4 shrink-0" />
        Real prospecting results only — no budget or ad-spend tracking yet, since there&apos;s no real ad-platform data behind it.
      </div>
    </div>
  );
}
