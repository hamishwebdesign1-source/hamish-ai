"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Megaphone, Plus, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, updateCampaignStatus, assignProspectToCampaign } from "@/app/studio/(authed)/campaigns/actions";

type Campaign = { id: string; name: string; objective: string | null; status: string; created_at: string };
type Prospect = { id: string; business_name: string; campaign_id: string | null; status: string };

const selectClasses =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

function AddProspectControl({ campaignId, unassigned }: { campaignId: string; unassigned: Prospect[] }) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  if (unassigned.length === 0) return null;

  function add() {
    if (!selected) return;
    startTransition(async () => {
      await assignProspectToCampaign(selected, campaignId);
      setSelected("");
    });
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className={selectClasses}>
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
  );
}

function CampaignCard({ campaign, prospects, unassigned }: { campaign: Campaign; prospects: Prospect[]; unassigned: Prospect[] }) {
  const [status, setStatus] = useState(campaign.status);
  const [pending, startTransition] = useTransition();

  const converted = prospects.filter((p) => p.status === "converted").length;
  const conversionRate = prospects.length > 0 ? Math.round((converted / prospects.length) * 100) : null;

  function toggleStatus() {
    const next = status === "completed" ? "active" : "completed";
    setStatus(next);
    startTransition(async () => {
      const r = await updateCampaignStatus(campaign.id, next);
      if (r && "error" in r) setStatus(campaign.status);
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{campaign.name}</p>
            {campaign.objective && <p className="mt-0.5 text-xs text-muted-foreground">{campaign.objective}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={status === "completed" ? "secondary" : "accent"}>{status === "completed" ? "Completed" : "Active"}</Badge>
            <Button size="xs" variant="ghost" disabled={pending} onClick={toggleStatus}>
              {status === "completed" ? "Reopen" : "Mark completed"}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <span>{prospects.length} prospect{prospects.length === 1 ? "" : "s"}</span>
          <span>{converted} converted</span>
          {conversionRate !== null ? <span>{conversionRate}% conversion</span> : <span>No data yet</span>}
        </div>
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

      {campaigns.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <Megaphone className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No campaigns yet — create one, then assign prospects to it as you find them.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {campaigns.map((c) => (
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
