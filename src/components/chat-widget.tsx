"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { getCaseStudy } from "@/lib/case-studies-data";

type Message = { role: "user" | "assistant"; content: string };

const DEFAULT_GREETING =
  "Hi, I'm the AI assistant. I can show you how AI could help your business. What type of business do you run — restaurant, hotel, trades, salon, gym, professional service, or retail?";

const SUGGESTED_PROMPTS = [
  "What could AI do for my business?",
  "How much does this cost?",
  "Show me an example",
];

function getProjectSlugFromPathname(pathname: string) {
  const match = pathname.match(/^\/portfolio\/([^/]+)$/);
  return match ? match[1] : null;
}

function getProjectFromPathname(pathname: string) {
  const slug = getProjectSlugFromPathname(pathname);
  return slug ? getCaseStudy(slug) ?? null : null;
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const project = getProjectFromPathname(pathname);
    return [
      {
        role: "assistant",
        content: project
          ? `Hi, I'm the AI assistant. I can see you're looking at the case study for ${project.name} — want me to explain how any of its AI features work, or answer anything else about the project?`
          : DEFAULT_GREETING,
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadSaved, setLeadSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          projectSlug: getProjectSlugFromPathname(pathname),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong — please try again.");
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      if (data.leadSaved) setLeadSaved(true);
    } catch {
      setError("Couldn't reach the AI assistant — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end p-0 sm:inset-auto sm:right-6 sm:bottom-24 sm:p-0">
          <div className="flex h-full w-full flex-col border border-border bg-card shadow-2xl sm:h-[560px] sm:w-96 sm:rounded-xl">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground sm:rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15">
                  <LogoMark className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">AI Assistant</p>
                  <p className="text-xs text-primary-foreground/70">Hamish AI · usually replies instantly</p>
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                aria-label="Close chat"
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
              {loading && (
                <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-3 py-2.5">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                  <span className="text-xs text-muted-foreground">AI is typing…</span>
                </div>
              )}
              {leadSaved && !loading && (
                <div className="mx-auto flex max-w-[95%] items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent">
                  <Sparkles className="size-3.5 shrink-0" />
                  Your details are saved — a real person will follow up soon.
                </div>
              )}
              {error && (
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {messages.length === 1 && !loading && (
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
                placeholder="Ask about AI for your business…"
                aria-label="Message"
                disabled={loading}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                type="submit"
                size="icon"
                variant="gradient"
                aria-label="Send message"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <Button
        size="icon-lg"
        variant="gradient"
        className="fixed right-6 bottom-6 z-50 size-14 rounded-full shadow-lg"
        aria-label={open ? "Close AI assistant chat" : "Open AI assistant chat"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <LogoMark className="size-6" />}
      </Button>
    </>
  );
}
