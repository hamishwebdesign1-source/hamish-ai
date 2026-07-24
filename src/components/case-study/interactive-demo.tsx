"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/eyebrow";
import type { CaseStudy } from "@/lib/case-studies-data";

type Message = { role: "user" | "assistant"; content: string };

// Deliberately NOT the full CaseStudy type: this is a Client Component, and
// CaseStudy carries lucide-react icon component references (aiFeatures/stats)
// that aren't plain serializable data. Passing the whole object across the
// server→client boundary throws "Only plain objects can be passed to Client
// Components" — so this only accepts the plain-data fields actually used
// here.
type DemoStudy = Pick<CaseStudy, "slug" | "name" | "persona">;

export function InteractiveDemoSection({ study }: { study: DemoStudy }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: study.persona.greeting },
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, demoSlug: study.slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong — please try again.");
        return;
      }

      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the demo assistant — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mx-auto justify-center" pulse>
            Live interactive demo
          </Eyebrow>
          <h2 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">
            Try {study.name}&apos;s AI assistant yourself
          </h2>
          <p className="mt-3 text-muted-foreground">
            This is a real, working conversation — not a script. {study.name} is
            an illustrative portfolio example, but the assistant below is
            genuinely thinking through what you type.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-lg overflow-hidden rounded-xl border border-border shadow-2xl shadow-accent/10">
          <div className="flex items-center gap-1.5 border-b border-border bg-background/60 px-3 py-2">
            <span className="size-2.5 rounded-full bg-destructive/50" />
            <span className="size-2.5 rounded-full bg-accent/50" />
            <span className="size-2.5 rounded-full bg-emerald-500/50" />
            <span className="ml-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              {study.name}
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex h-[420px] flex-col gap-3 overflow-y-auto bg-background p-4"
          >
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
                <span className="text-xs text-muted-foreground">Typing…</span>
              </div>
            )}
            {error && (
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
                {error}
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {study.persona.suggestedPrompts.map((prompt) => (
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
              placeholder={`Ask ${study.name} anything…`}
              aria-label="Message"
              disabled={loading}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button
              type="submit"
              size="icon"
              variant="ai"
              aria-label="Send message"
              disabled={loading || !input.trim()}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
