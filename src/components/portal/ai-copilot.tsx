"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

// Client portal redesign Phase 3 — extracted from insights-centre.tsx's
// CopilotTab, which previously only existed as one of four tabs inside the
// Insights page. This is the real account-aware AI copilot
// (/api/portal/copilot -> answerAccountQuestion) — now promoted to its
// own page (/portal/ask) as the one clear "Ask HamishAI" entry point the
// brief asked for, in place of the weaker duplicate AskSupportAgent box
// that used to sit on both Home and Help. Same component, same backend,
// unchanged — this stage is a promotion, not a rebuild.

type Message = { role: "user" | "assistant"; content: string };

export function AiCopilot({ businessName }: { businessName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hi, I'm your AI Copilot. Ask me anything about ${businessName}'s account — requests, spend, site health.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/portal/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong — please try again.");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the copilot — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const suggestedPrompts = ["How many requests do I have open?", "What's my site uptime this month?", "What have you sent me invoices for?"];

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive/50" />
        <span className="size-2.5 rounded-full bg-accent/50" />
        <span className="size-2.5 rounded-full bg-emerald-500/50" />
        <span className="ml-2 text-eyebrow">AI Copilot — your account</span>
      </div>
      <div ref={scrollRef} className="flex h-[420px] flex-col gap-3 overflow-y-auto bg-background p-4">
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
        {loading && (
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
          <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">{error}</div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestedPrompts.map((prompt) => (
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
          placeholder="Ask about your account…"
          aria-label="Message"
          disabled={loading}
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="icon" variant="ai" aria-label="Send message" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
