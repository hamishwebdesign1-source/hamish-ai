"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askClientsCopilot } from "@/app/studio/(authed)/clients/actions";

// Studio's own AI Business Analyst (Command Centre Phase 3), scoped to
// the Clients page — same UI shape as the portal's own AiCopilot
// (ai-copilot.tsx), but calling the Server Action directly (useTransition)
// rather than fetching an API route, same convention as every other
// Studio interaction in this file's siblings. Collapsed by default:
// unlike the portal's copilot (its own dedicated page), this shares the
// Clients page with the client list itself, so it shouldn't be the first
// thing pushing that list down before anyone's asked for it.

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = ["How's revenue this month?", "Which clients haven't paid?", "Who needs attention right now?"];

export function ClientsCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me about your business — revenue, prospects, who needs attention, what's overdue." },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || pending) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);

    startTransition(async () => {
      const result = await askClientsCopilot(next);
      if ("error" in result) {
        setError(result.error ?? "Something went wrong — please try again.");
        return;
      }
      setMessages([...next, { role: "assistant", content: result.reply }]);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 bg-secondary/40 px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-accent" /> AI Business Analyst
        </span>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          <div ref={scrollRef} className="flex h-[320px] flex-col gap-3 overflow-y-auto bg-background p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-left text-sm text-primary-foreground"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2 text-left text-sm whitespace-pre-line text-secondary-foreground"
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
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
                {error}
              </div>
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
            className="flex items-center gap-2 border-t border-border bg-background p-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your business…"
              aria-label="Message"
              disabled={pending}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" size="icon" variant="ai" aria-label="Send message" disabled={pending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
