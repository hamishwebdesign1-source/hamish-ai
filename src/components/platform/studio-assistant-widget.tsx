"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askStudioAssistant } from "@/app/studio/(authed)/assistant-actions";
import { useFocusTrap } from "@/lib/use-focus-trap";

// Scoped in chat 2026-09-02 before any code was written (see
// answer-studio-question.ts's own comment for the full reasoning) — a
// global floating widget, bottom-left on every /studio page, so it's the
// personalised in-app assistant the marketing site already has for
// visitors, but for the tenant running their own agency instead. Visual
// shape borrowed from chat-widget.tsx (the marketing site's own widget)
// but NOT sharing its backend at all — that one posts to the public,
// unauthenticated /api/chat, which has zero org-context handling; mixing
// tenant-scoped data into that route would be a real cross-tenant risk.
// This one calls askStudioAssistant() directly (useTransition), the same
// Server-Action-not-fetch convention every other Studio interaction uses.
// (Its closest sibling used to be the Clients page's own embedded
// ClientsCopilot, calling a narrower askClientsCopilot() — retired in the
// Studio Design Audit's AI-surface consolidation, docs/ai-team/DECISIONS.md,
// once askStudioAssistant() was confirmed a strict superset of its data.)
//
// bottom-LEFT specifically (explicit ask) — the marketing widget is
// bottom-right; nothing else in the authed Studio shell is anchored
// bottom-left (confirmed before building this).

type Message = { role: "user" | "assistant"; content: string };

function buildGreeting(orgName: string): string {
  return `Hi — I can answer real questions about ${orgName} (revenue, clients, who needs attention) or how anything in Studio works. What do you need?`;
}

const SUGGESTED_PROMPTS = ["How's revenue this month?", "Who needs attention right now?", "How do I invoice a client?"];

export function StudioAssistantWidget({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [{ role: "assistant", content: buildGreeting(orgName) }]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  // Studio Design Audit, Tier 5 item #14 — this overlay had a visible
  // close button but no Escape handler at all (unlike
  // studio-command-palette.tsx, which already had one), and no focus
  // trap, so a keyboard user could Tab straight out of it into the page
  // behind. Escape-to-close plus the same shared Tab-wrap trap the
  // palette now uses.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useFocusTrap(panelRef, open);

  function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || pending) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);

    startTransition(async () => {
      const result = await askStudioAssistant(next);
      if ("error" in result) {
        setError(result.error ?? "Something went wrong — please try again.");
        return;
      }
      setMessages([...next, { role: "assistant", content: result.reply }]);
    });
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-start p-0 sm:inset-auto sm:bottom-24 sm:left-6 sm:p-0">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Studio AI Assistant"
            className="flex h-full w-full flex-col border border-border bg-card shadow-2xl sm:h-[560px] sm:w-96 sm:rounded-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground sm:rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Studio AI Assistant</p>
                  <p className="text-xs text-primary-foreground/70">Your business, and how Studio works</p>
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm whitespace-pre-line text-secondary-foreground"
                  }
                >
                  {m.content}
                </div>
              ))}
              {pending && (
                <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-3 py-2.5">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              )}
              {error && (
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}
              {messages.length === 1 && !pending && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your business or Studio…"
                aria-label="Message"
                disabled={pending}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="icon" variant="ai" aria-label="Send message" disabled={pending || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <Button
        size="icon-lg"
        variant="ai"
        className="fixed bottom-6 left-6 z-50 size-14 rounded-full shadow-lg"
        aria-label={open ? "Close Studio AI Assistant" : "Open Studio AI Assistant"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-6" />}
      </Button>
    </>
  );
}
