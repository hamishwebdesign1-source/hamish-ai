"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createWebsiteProject } from "@/app/studio/(authed)/website-builder/actions";
import { WEBSITE_OBJECTIVES, SITEMAP_PAGE_OPTIONS, type WebsiteDiscovery, type WizardPrefill, type WizardPrefillFieldKey } from "@/lib/website-brief";

const EMPTY: Omit<WebsiteDiscovery, "objectives" | "sitemapPages"> = {
  businessName: "",
  industry: "",
  location: "",
  targetAudience: "",
  servicesProducts: "",
  usps: "",
  designStyle: "",
  designColours: "",
  designFonts: "",
  designExamples: "",
  existingWebsiteUrl: "",
  contentNotes: "",
};

// Prospects → Website Builder prefill (BACKLOG.md, 2026-09-03) —
// DESIGN-SYSTEM.md's "Field-provenance tags on a prefilled form": hard
// tier reuses onboarding-wizard.tsx's own shrunk secondary-badge
// treatment plus a Link2 icon; soft tier is the `ai` variant, worded as
// a review prompt rather than a plain fact. Rendered next to a <Label>,
// never on the input itself, and never for a field with no prefill entry
// at all — a from-scratch field renders with no tag, exactly as before.
function PrefillTag({ prefill, field }: { prefill: WizardPrefill | undefined; field: WizardPrefillFieldKey }) {
  const entry = prefill?.fields[field];
  if (!entry) return null;
  if (entry.tier === "hard") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
        <Link2 className="size-2.5" /> Prefilled
      </Badge>
    );
  }
  return (
    <Badge variant="ai" className="gap-1 text-[10px] font-normal">
      Needs review
    </Badge>
  );
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={active}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? "border-accent bg-accent/10 text-accent" : "border-input text-muted-foreground hover:text-foreground"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// Prospects → Website Builder prefill (BACKLOG.md, 2026-09-03) — a
// one-time seed of local state, computed once on mount from whatever the
// server component already resolved. Never a server-side default baked
// into createWebsiteProject itself: after this initial render the user
// can freely edit or clear any field exactly as if they'd typed it, and
// nothing here re-applies on a later prefill/clientId change.
function initialFieldsFromPrefill(prefill: WizardPrefill | undefined): typeof EMPTY {
  if (!prefill) return EMPTY;
  const next = { ...EMPTY };
  for (const key of Object.keys(prefill.fields) as WizardPrefillFieldKey[]) {
    const entry = prefill.fields[key];
    if (entry) next[key] = entry.value;
  }
  return next;
}

// AI Website Creation Guide, WB1 — a single scrollable form rather than a
// stateful multi-step client wizard: every question from the brief's §2
// is still asked, just without the extra complexity of step-navigation
// state for a first version. File upload deliberately isn't here — no
// upload infrastructure exists in this app yet (see the architecture
// plan's own note); existingWebsiteUrl and designExamples cover
// pointing at real reference material by URL instead.
export function WebsiteProjectWizard({
  clients,
  initialClientId,
  prefill,
}: {
  clients: { id: string; business_name: string }[];
  initialClientId?: string;
  prefill?: WizardPrefill;
}) {
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? "");
  const [fields, setFields] = useState(() => initialFieldsFromPrefill(prefill));
  const [objectives, setObjectives] = useState<string[]>([]);
  const [sitemapPages, setSitemapPages] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(list: string[], setList: (next: string[]) => void, option: string) {
    setList(list.includes(option) ? list.filter((o) => o !== option) : [...list, option]);
  }

  function submit() {
    setError(null);
    if (!clientId) {
      setError("Choose a client.");
      return;
    }
    if (!fields.businessName.trim()) {
      setError("Business name is required.");
      return;
    }
    startTransition(async () => {
      const discovery: Partial<WebsiteDiscovery> = { ...fields, objectives, sitemapPages };
      const r = await createWebsiteProject(clientId, discovery);
      // A successful call redirects server-side and never returns here —
      // only an error result reaches this line.
      if (r && "error" in r) setError(r.error);
    });
  }

  return (
    <div className="space-y-5">
      {prefill && (
        <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <Link2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <p className="text-xs text-accent">
            Started from {prefill.sourceBusinessName}&apos;s prospecting research — fields marked{" "}
            <span className="font-medium">Prefilled</span> came from real data on file; everything else is blank,
            same as starting from scratch.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-heading text-sm font-semibold">Client</h2>
          <div>
            <Label htmlFor="wp-client">Which client is this for?</Label>
            <select
              id="wp-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-heading text-sm font-semibold">Understand the client</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="wp-name">Business name</Label>
                <PrefillTag prefill={prefill} field="businessName" />
              </div>
              <Input id="wp-name" value={fields.businessName} onChange={(e) => set("businessName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="wp-industry">Industry</Label>
                <PrefillTag prefill={prefill} field="industry" />
              </div>
              <Input id="wp-industry" value={fields.industry} onChange={(e) => set("industry", e.target.value)} className="mt-1" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="wp-location">Location</Label>
                <PrefillTag prefill={prefill} field="location" />
              </div>
              <Input id="wp-location" value={fields.location} onChange={(e) => set("location", e.target.value)} className="mt-1" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="wp-existing">Existing website (if any)</Label>
                <PrefillTag prefill={prefill} field="existingWebsiteUrl" />
              </div>
              <Input
                id="wp-existing"
                value={fields.existingWebsiteUrl}
                onChange={(e) => set("existingWebsiteUrl", e.target.value)}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="wp-audience">Target audience</Label>
            <Textarea id="wp-audience" rows={2} value={fields.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="wp-services">Services / products</Label>
              <PrefillTag prefill={prefill} field="servicesProducts" />
            </div>
            <Textarea id="wp-services" rows={2} value={fields.servicesProducts} onChange={(e) => set("servicesProducts", e.target.value)} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="wp-usps">What makes them different (USPs)</Label>
              <PrefillTag prefill={prefill} field="usps" />
            </div>
            <Textarea id="wp-usps" rows={2} value={fields.usps} onChange={(e) => set("usps", e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-heading text-sm font-semibold">Website objectives</h2>
          <CheckboxGroup options={WEBSITE_OBJECTIVES} selected={objectives} onToggle={(o) => toggle(objectives, setObjectives, o)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-heading text-sm font-semibold">Website structure</h2>
          <p className="text-xs text-muted-foreground">Which pages does this site need?</p>
          <CheckboxGroup options={SITEMAP_PAGE_OPTIONS} selected={sitemapPages} onToggle={(o) => toggle(sitemapPages, setSitemapPages, o)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-heading text-sm font-semibold">Design</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="wp-colours">Colour preferences</Label>
              <Input id="wp-colours" value={fields.designColours} onChange={(e) => set("designColours", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="wp-fonts">Font preferences</Label>
              <Input id="wp-fonts" value={fields.designFonts} onChange={(e) => set("designFonts", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="wp-style">Preferred style</Label>
            <Textarea id="wp-style" rows={2} value={fields.designStyle} onChange={(e) => set("designStyle", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="wp-examples">Example or competitor websites (URLs, one per line)</Label>
            <Textarea id="wp-examples" rows={2} value={fields.designExamples} onChange={(e) => set("designExamples", e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-heading text-sm font-semibold">Content notes</h2>
          <p className="text-xs text-muted-foreground">
            Summarise anything relevant — brand guidelines, testimonials, key content from documents or brochures.
            File upload isn&apos;t supported yet; paste the key points here.
          </p>
          <Textarea rows={4} value={fields.contentNotes} onChange={(e) => set("contentNotes", e.target.value)} />
        </CardContent>
      </Card>

      <div>
        <Button disabled={pending} onClick={submit}>
          {pending ? "Creating project…" : "Create project and generate brief"}
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
