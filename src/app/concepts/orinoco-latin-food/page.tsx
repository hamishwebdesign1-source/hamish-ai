"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, UtensilsCrossed, Leaf, Coins, Bike, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

const HIGHLIGHTS = [
  { icon: UtensilsCrossed, title: "Arepas & empanadas", body: "The dishes reviewers rave about" },
  { icon: Leaf, title: "Gluten-free menu", body: "Almost the whole kitchen, clearly marked" },
  { icon: Coins, title: "Great value", body: "Around £6 a dish, generous portions" },
  { icon: Bike, title: "Deliveroo & social", body: "Where most orders come from today" },
];

const MENU = [
  { name: "Arepa Pabellón", price: "£11" },
  { name: "Arepa Catira", price: "£10" },
  { name: "Empanadas (cheese)", price: "£4" },
  { name: "Cachapas", price: "Fresh corn pancakes" },
];

const CHIPS = [
  { stat: "0", label: "their own website domain doesn't resolve at all" },
  { stat: "509", label: "reviews averaging 4.9 out of 5" },
  { stat: "24/7", label: "an assistant could be answering, kitchen open or not" },
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

// An abstract radiating sun-ray burst — warmth and energy without leaning
// on any literal cultural symbol. Distinct from every other concept
// page's motif.
function RaysMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x2 = 300 + Math.cos(angle) * 340;
        const y2 = 300 + Math.sin(angle) * 340;
        return (
          <line
            key={i}
            x1="300"
            y1="300"
            x2={x2}
            y2={y2}
            stroke="#e8703f"
            strokeWidth="3"
            opacity={0.12 - (i % 3) * 0.02}
          />
        );
      })}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hola! I'm Orinoco's AI assistant. Ask me anything.";
const SUGGESTED = ["What should I order?", "Is it gluten-free?", "How do I order?"];

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
      const res = await fetch("/api/concepts/orinoco-latin-food/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#4a2e1e] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#4a2e1e] bg-[#1c130c] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#e8703f]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#c2a68f] uppercase">Orinoco — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#2b1710] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8703f] px-3 py-2 text-sm text-[#fbf3e7]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#3a2116] px-3 py-2 text-sm whitespace-pre-line text-[#fbf3e7]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#3a2116] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#c2a68f] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c2a68f] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c2a68f]" />
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
                className="rounded-full border border-[#4a2e1e] px-3 py-1.5 text-xs text-[#c2a68f] transition-colors hover:border-[#e8703f] hover:text-[#fbf3e7]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#4a2e1e] bg-[#1c130c] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#4a2e1e] bg-[#2b1710] px-3 text-sm text-[#fbf3e7] outline-none placeholder:text-[#8a6f5c] focus-visible:border-[#e8703f]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e8703f] text-[#2b1710] transition-colors hover:bg-[#f0834f] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function OrinocoLatinFoodConcept() {
  return (
    <div className="min-h-screen bg-[#fbf3e7] text-[#2b1710]">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#2b1710] px-4 py-1.5 text-center text-[11px] text-[#c2a68f]">
        <span>
          Concept by <span className="text-[#fbf3e7]">Hamish AI</span> for{" "}
          <span className="text-[#fbf3e7]">Orinoco Latin Food</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#fbf3e7] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#2b1710] text-[#fbf3e7]">
        <Image
          src="/images/concepts/orinoco-latin-food/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2b1710] via-[#2b1710]/90 to-[#2b1710]/55" />
        <RaysMotif className="pointer-events-none absolute top-1/2 right-[-10%] size-[700px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-[#f0a578] uppercase">Leith Walk · Edinburgh</p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              509 reasons to love
              <br />
              <span className="text-[#f0a578]">Leith Walk&apos;s Venezuelan kitchen.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#c2a68f]">
              Empanadas and arepas that earn a 4.9 average, at around £6 a dish.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#fbf3e7]/80 hover:text-[#fbf3e7]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#4a2e1e]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={4.9} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#c2a68f] uppercase">Average rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={509} />
              </p>
              <p className="mt-1 text-[11px] text-[#c2a68f] uppercase">Reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                ~£6
              </p>
              <p className="mt-1 text-[11px] text-[#c2a68f] uppercase">Average per dish</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#e8703f] uppercase">On the menu</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.title} delay={i * 80}>
              <div className="group h-full rounded-xl border border-[#ecdcc4] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#e8703f] hover:shadow-xl">
                <h.icon className="size-6 text-[#e8703f] transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {h.title}
                </p>
                <p className="mt-1.5 text-sm text-[#6b4c3a]">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Real menu, real prices */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#e8703f] uppercase">A few dishes</p>
          <div className="mt-6 divide-y divide-[#ecdcc4] overflow-hidden rounded-xl border border-[#ecdcc4] bg-white">
            {MENU.map((m) => (
              <div key={m.name} className="flex items-center justify-between gap-4 px-6 py-4">
                <span className="font-medium">{m.name}</span>
                <span className="tabular-nums text-[#8a6f5c]">{m.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8a6f5c]">
            Sample dishes and prices as listed on delivery platforms — the full menu changes regularly.
          </p>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#e8703f] px-6 py-24 text-[#2b1710]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-medium text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            &ldquo;One of my go-to spots for a quick, authentic meal.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Customer review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#2b1710] px-6 py-24 text-[#fbf3e7]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.2em] text-[#f0a578] uppercase">Live demo</p>
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
          <p className="font-mono text-xs tracking-[0.2em] text-[#e8703f] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#ecdcc4] bg-white p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#6b4c3a]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a6f5c]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest order windows, most-ordered dishes, delivery vs. walk-in split —
            illustrative, not Orinoco&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#4a2e1e] bg-[#2b1710] px-6 py-24 text-center text-[#fbf3e7]">
        <Reveal>
          <p className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            Food this loved deserves a front door of its own.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#f0a578] underline underline-offset-4 hover:text-[#f5bc9a]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#2b1710] px-6 pb-10 text-center text-[11px] text-[#8a6f5c]">
        Orinoco Latin Food · 281 Leith Walk, Edinburgh, EH6 8PD
        <br />
        Built from publicly available information only — not affiliated with or published by Orinoco Latin Food.
      </footer>
    </div>
  );
}
