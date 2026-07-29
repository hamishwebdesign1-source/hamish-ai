"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, Sandwich, Flame, Beef, Salad, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

const HIGHLIGHTS = [
  { icon: Sandwich, title: "Breakfast rolls", body: "The regulars' order" },
  { icon: Flame, title: "Cajun chips", body: "\"Best I've ever had\" — reviewer" },
  { icon: Beef, title: "Chicken burgers", body: "Crispy bacon, fresh salad" },
  { icon: Salad, title: "Fresh, healthy ingredients", body: "Generous portions, every time" },
];

const CHIPS = [
  { stat: "→", label: "their own domain now redirects to an unrelated car garage" },
  { stat: "4.8★", label: "Tripadvisor rating, #31 of 72 restaurants in Motherwell" },
  { stat: "24/7", label: "an assistant could be answering, counter open or not" },
];

function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 1400;
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// A perforated ticket-stub edge — evokes an order ticket rather than
// decoration for decoration's sake, and distinct from the other concept
// pages' motifs.
function TicketMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => (
        <circle key={i} cx="470" cy={20 + i * 38} r="9" fill="#f9f5ec" opacity="0.9" />
      ))}
      <line x1="470" y1="0" x2="470" y2="600" stroke="#c23b2e" strokeWidth="1.5" opacity="0.3" strokeDasharray="2 10" />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Deli Express's AI assistant. Ask me anything.";
const SUGGESTED = ["What should I order?", "Where are you based?", "What's on the menu?"];

function ConceptChat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
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
      const res = await fetch("/api/concepts/deli-express/chat", {
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
      setError("Couldn't reach the assistant — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#4a2a24] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#4a2a24] bg-[#1c110e] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c23b2e]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#b89a90] uppercase">
          Deli Express — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#241512] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c23b2e] px-3 py-2 text-sm text-[#f9f5ec]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#331d18] px-3 py-2 text-sm whitespace-pre-line text-[#f9f5ec]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#331d18] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#b89a90] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#b89a90] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#b89a90]" />
            </span>
          </div>
        )}
        {error && (
          <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => sendMessage(p)}
                className="rounded-full border border-[#4a2a24] px-3 py-1.5 text-xs text-[#b89a90] transition-colors hover:border-[#c23b2e] hover:text-[#f9f5ec]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#4a2a24] bg-[#1c110e] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          aria-label="Message"
          disabled={loading}
          className="h-9 flex-1 rounded-md border border-[#4a2a24] bg-[#241512] px-3 text-sm text-[#f9f5ec] outline-none placeholder:text-[#7a6459] focus-visible:border-[#c23b2e]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c23b2e] text-[#f9f5ec] transition-colors hover:bg-[#d24c3e] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function DeliExpressConcept() {
  return (
    <div className="min-h-screen bg-[#f9f5ec] text-[#241512]">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#241512] px-4 py-1.5 text-center text-[11px] text-[#b89a90]">
        <span>
          Concept by <span className="text-[#f9f5ec]">Hamish AI</span> for{" "}
          <span className="text-[#f9f5ec]">Deli Express</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f9f5ec] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#241512] text-[#f9f5ec]">
        <Image
          src="/images/concepts/deli-express/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#241512] via-[#241512]/90 to-[#241512]/60" />
        <TicketMotif className="pointer-events-none absolute top-0 right-[-4%] h-full w-[500px]" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-[#e8836f] uppercase">Motherwell</p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              The breakfast roll
              <br />
              <span className="text-[#e8836f]">Motherwell can&apos;t stop talking about.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#b89a90]">
              Cajun chips, chicken burgers, and fresh, honest ingredients — rated 4.8 on Tripadvisor.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f9f5ec]/80 hover:text-[#f9f5ec]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#4a2a24]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={4.8} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#b89a90] uppercase">Tripadvisor rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={4.6} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#b89a90] uppercase">Google rating</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                #31 / 72
              </p>
              <p className="mt-1 text-[11px] text-[#b89a90] uppercase">Restaurants in Motherwell</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#c23b2e] uppercase">On the menu</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.title} delay={i * 80}>
              <div className="group h-full rounded-xl border border-[#ecdfd4] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#c23b2e] hover:shadow-xl">
                <h.icon className="size-6 text-[#c23b2e] transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {h.title}
                </p>
                <p className="mt-1.5 text-sm text-[#6b5348]">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#241512] px-6 py-24 text-[#f9f5ec]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.2em] text-[#e8836f] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              Your own AI assistant.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8">
              <ConceptChat />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Insight chips */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#c23b2e] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#ecdfd4] bg-white p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#6b5348]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a7469]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest order times, most-ordered items, repeat-customer rate —
            illustrative, not Deli Express&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#4a2a24] bg-[#241512] px-6 py-24 text-center text-[#f9f5ec]">
        <Reveal>
          <p className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            A 4.8★ deli deserves its own front door back.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#e8836f] underline underline-offset-4 hover:text-[#f2a08f]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#241512] px-6 pb-10 text-center text-[11px] text-[#8a7469]">
        Deli Express · 347 Orbiston Street, Motherwell, North Lanarkshire, ML1 1QW
        <br />
        Built from publicly available information only — not affiliated with or published by Deli Express.
      </footer>
    </div>
  );
}
