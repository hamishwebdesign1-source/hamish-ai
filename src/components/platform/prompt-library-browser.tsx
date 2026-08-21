"use client";

import { useMemo, useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROMPT_LIBRARY, PROMPT_CATEGORY_LABELS, type PromptCategory, type PromptTemplate } from "@/lib/website-prompt-library";

const TOKEN_RE = /\[([^\]]+)\]/g;

function extractTokens(template: string): string[] {
  const tokens = new Set<string>();
  for (const match of template.matchAll(TOKEN_RE)) tokens.add(match[1]);
  return Array.from(tokens);
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(TOKEN_RE, (full, token) => {
    const value = values[token]?.trim();
    return value ? value : full;
  });
}

export type PromptLibraryPrefill = {
  businessName?: string;
  location?: string;
  brandColours?: string;
  pageNames?: string[];
};

function PromptCard({ prompt, prefill }: { prompt: PromptTemplate; prefill: PromptLibraryPrefill }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => extractTokens(prompt.template), [prompt.template]);

  const [values, setValues] = useState<Record<string, string>>(() => ({
    "BUSINESS NAME": prefill.businessName ?? "",
    LOCATION: prefill.location ?? "",
    "BRAND COLOURS": prefill.brandColours ?? "",
    "PAGE NAME": prefill.pageNames?.[0] ?? "",
  }));

  const filled = fillTemplate(prompt.template, values);
  const hasBlanks = tokens.some((t) => !values[t]?.trim());

  return (
    <Card>
      <CardContent className="py-3.5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-sm font-medium">{prompt.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{prompt.whenToUse}</p>
          </div>
          {open ? <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        </button>

        {open && (
          <div className="mt-3.5 space-y-3 border-t border-border pt-3.5">
            {tokens.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {tokens.map((token) =>
                  token === "PAGE NAME" && prefill.pageNames && prefill.pageNames.length > 0 ? (
                    <div key={token}>
                      <label className="text-xs font-medium text-muted-foreground">{token}</label>
                      <select
                        className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        value={values[token] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [token]: e.target.value }))}
                      >
                        <option value="">Choose a page…</option>
                        {prefill.pageNames.map((page) => (
                          <option key={page} value={page}>
                            {page}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div key={token}>
                      <label className="text-xs font-medium text-muted-foreground">{token}</label>
                      <Input
                        className="mt-1"
                        value={values[token] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [token]: e.target.value }))}
                        placeholder={`Fill in ${token.toLowerCase()}…`}
                      />
                    </div>
                  )
                )}
              </div>
            )}

            <pre className="max-h-56 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground">{filled}</pre>
            {hasBlanks && <p className="text-xs text-muted-foreground">Still has blanks — fill them in above, or copy as-is and finish it yourself.</p>}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(filled);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy prompt"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI Website Creation Guide, WB6 — the "make it better" prompt library
// browser. No AI call anywhere in here: templates are static data
// (website-prompt-library.ts), and any [TOKEN] placeholders are filled
// in client-side from the project's own real discovery/brief data when
// opened from a project, or left blank for the agency to fill in
// themselves when browsed standalone.
export function PromptLibraryBrowser({ prefill }: { prefill: PromptLibraryPrefill }) {
  const [activeCategory, setActiveCategory] = useState<PromptCategory | "all">("all");

  const categories = Object.keys(PROMPT_CATEGORY_LABELS) as PromptCategory[];
  const visible = activeCategory === "all" ? PROMPT_LIBRARY : PROMPT_LIBRARY.filter((p) => p.category === activeCategory);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide ${
            activeCategory === "all" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide ${
              activeCategory === cat ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {PROMPT_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No prompts in this category yet.</p>
          </div>
        ) : (
          visible.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} prefill={prefill} />)
        )}
      </div>
    </div>
  );
}
