"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Wrench, ChevronDown, ChevronUp, MessageSquareWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTroubleshootingHelp } from "@/app/studio/(authed)/website-builder/actions";
import type { TroubleshootingEntry } from "@/lib/website-troubleshooting";

function CopyFixPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy fix prompt"}
    </Button>
  );
}

function TroubleshootingResult({ entry }: { entry: TroubleshootingEntry }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">What&apos;s happening</p>
        <p className="mt-1 text-sm">{entry.diagnosis}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">Paste this into your AI coding tool</p>
        <pre className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground">
          {entry.fixPrompt}
        </pre>
      </div>
      <CopyFixPromptButton text={entry.fixPrompt} />
    </div>
  );
}

// AI Website Creation Guide, WB5 — the troubleshooting composer (plan
// doc §12). Deliberately not a fix HamishAI applies itself: it turns a
// plain-language description of what's wrong into a diagnosis and a
// ready-to-paste instruction for whichever AI coding tool the agency is
// using, same "you stay in charge of the build" boundary as the rest of
// this capability.
export function TroubleshootingComposer({ projectId, initialLog }: { projectId: string; initialLog: TroubleshootingEntry[] }) {
  const [issue, setIssue] = useState("");
  const [log, setLog] = useState<TroubleshootingEntry[]>(initialLog);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const latest = log[log.length - 1] ?? null;
  const earlier = log.slice(0, -1).reverse();

  function submit() {
    setError(null);
    const trimmed = issue.trim();
    if (!trimmed) {
      setError("Describe what's going wrong first.");
      return;
    }
    startTransition(async () => {
      const r = await getTroubleshootingHelp(projectId, trimmed);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setLog((prev) => [...prev, r.entry]);
      setIssue("");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-accent" />
          <p className="font-heading text-sm font-semibold">Stuck on something?</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Describe what&apos;s going wrong in plain language — no need to know what&apos;s technically happening. You&apos;ll get a
          plain-English diagnosis and a ready-to-paste instruction for your AI coding tool.
        </p>
        <Textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="e.g. the contact form doesn't send an email when I submit it"
          rows={3}
          disabled={pending}
        />
        <Button size="sm" disabled={pending} onClick={submit}>
          {pending ? "Thinking…" : "Get help"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}

        {latest && (
          <div className="border-t border-border pt-4">
            <TroubleshootingResult entry={latest} />
          </div>
        )}

        {earlier.length > 0 && (
          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent"
            >
              {historyOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {historyOpen ? "Hide" : "Show"} {earlier.length} earlier {earlier.length === 1 ? "question" : "questions"}
            </button>
            {historyOpen && (
              <ul className="mt-3 space-y-3">
                {earlier.map((entry) => (
                  <li key={entry.id}>
                    <div className="flex items-start gap-2">
                      <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-xs font-medium">{entry.issue}</p>
                    </div>
                    <div className="mt-2 ml-5.5">
                      <TroubleshootingResult entry={entry} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
