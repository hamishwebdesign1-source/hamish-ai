"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, Home, UtensilsCrossed, TreePine, Mountain, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

const HIGHLIGHTS = [
  { icon: Home, title: "17th-century country home", body: "Centuries of Highland hospitality" },
  { icon: UtensilsCrossed, title: "Home-cooked dinners", body: "High-quality local ingredients" },
  { icon: TreePine, title: "The Garden Studio", body: "Self-catering, set in the orchard" },
  { icon: Mountain, title: "Stirling Castle views", body: "And the Wallace Monument beyond" },
];

const CHIPS = [
  { stat: "0", label: "pages of their own — the domain redirects straight to Tripadvisor" },
  { stat: "34", label: "Tripadvisor reviews, 4 of 5 — #5 of 6 B&Bs in Doune" },
  { stat: "24/7", label: "an assistant could be answering, whatever the hour" },
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

// Layered hill silhouettes — evokes the Trossachs setting rather than
// decoration for its own sake, distinct from the other concept motifs.
function HillsMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      <path d="M0 260 Q150 190 300 250 T600 220 V400 H0 Z" fill="#a67a94" opacity="0.14" />
      <path d="M0 310 Q180 250 340 300 T600 280 V400 H0 Z" fill="#a67a94" opacity="0.1" />
      <path d="M0 350 Q220 310 400 340 T600 330 V400 H0 Z" fill="#a67a94" opacity="0.08" />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello, I'm Mackeanston House's AI assistant. Ask me anything.";
const SUGGESTED = ["What's it like to stay?", "Tell me about the Garden Studio", "What's nearby?"];

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
      const res = await fetch("/api/concepts/mackeanston-house/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2f3c33] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2f3c33] bg-[#141d17] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#a67a94]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#9aa89f] uppercase">
          Mackeanston House — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#1b2420] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#a67a94] px-3 py-2 text-sm text-[#f4f0ee]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#25322b] px-3 py-2 text-sm whitespace-pre-line text-[#f4f0ee]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#25322b] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9aa89f] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9aa89f] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9aa89f]" />
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
                className="rounded-full border border-[#2f3c33] px-3 py-1.5 text-xs text-[#9aa89f] transition-colors hover:border-[#a67a94] hover:text-[#f4f0ee]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2f3c33] bg-[#141d17] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2f3c33] bg-[#1b2420] px-3 text-sm text-[#f4f0ee] outline-none placeholder:text-[#5f6d64] focus-visible:border-[#a67a94]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#a67a94] text-[#1b2420] transition-colors hover:bg-[#b98ba5] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function MackeanstonHouseConcept() {
  return (
    <div className="min-h-screen bg-[#f5f1e6] text-[#1e281f]">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#1b2420] px-4 py-1.5 text-center text-[11px] text-[#9aa89f]">
        <span>
          Concept by <span className="text-[#f4f0ee]">Hamish AI</span> for{" "}
          <span className="text-[#f4f0ee]">Mackeanston House</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f4f0ee] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#1b2420] text-[#f4f0ee]">
        <Image
          src="/images/concepts/mackeanston-house/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b2420] via-[#1b2420]/90 to-[#1b2420]/55" />
        <HillsMotif className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] w-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-[#c9a8ba] uppercase">
              Doune · Loch Lomond &amp; Trossachs
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Four centuries of hospitality.
              <br />
              <span className="text-[#c9a8ba]">One Highland welcome.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#9aa89f]">
              A 17th-century country home with views of Stirling Castle, home-cooked dinners, and a Garden Studio in
              the orchard.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f4f0ee]/80 hover:text-[#f4f0ee]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#2f3c33]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={4} />
              </p>
              <p className="mt-1 text-[11px] text-[#9aa89f] uppercase">Tripadvisor rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={34} />
              </p>
              <p className="mt-1 text-[11px] text-[#9aa89f] uppercase">Traveller reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                17th c.
              </p>
              <p className="mt-1 text-[11px] text-[#9aa89f] uppercase">Built</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#a67a94] uppercase">A stay here</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.title} delay={i * 80}>
              <div className="group h-full rounded-xl border border-[#e2dcc8] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#a67a94] hover:shadow-xl">
                <h.icon className="size-6 text-[#a67a94] transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {h.title}
                </p>
                <p className="mt-1.5 text-sm text-[#556155]">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#a67a94] px-6 py-24 text-[#1e281f]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-medium text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            &ldquo;More like visiting a country cousin than staying with strangers.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Tripadvisor review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#1b2420] px-6 py-24 text-[#f4f0ee]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.2em] text-[#c9a8ba] uppercase">Live demo</p>
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
          <p className="font-mono text-xs tracking-[0.2em] text-[#a67a94] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e2dcc8] bg-white p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#556155]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#7a8a7c]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — enquiry response time, booking-season demand, repeat-guest rate —
            illustrative, not Mackeanston House&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2f3c33] bg-[#1b2420] px-6 py-24 text-center text-[#f4f0ee]">
        <Reveal>
          <p className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            A home this welcoming deserves its own front door online.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#c9a8ba] underline underline-offset-4 hover:text-[#d9bdc9]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#1b2420] px-6 pb-10 text-center text-[11px] text-[#7a8a7c]">
        Mackeanston House · Doune, Stirling, Scotland
        <br />
        Built from publicly available information only — not affiliated with or published by Mackeanston House.
      </footer>
    </div>
  );
}
