"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Petrona, Hanken_Grotesk } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Petrona is a warm, slightly
// vintage serif — the feel of a well-kept ledger or old shipping
// manifest — for headings; Hanken Grotesk carries the body copy with a
// clean, contemporary neutrality.
const display = Petrona({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-off-display",
});
const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-off-body",
});

const MENU = [
  { name: "Brie & Chutney Bagel", price: "£6.45" },
  { name: "Baklava Cheesecake", price: "£4.80" },
  { name: "Brownie", price: "£3.00" },
  { name: "Carrot & Coriander Soup", price: "Served with a crusty roll" },
  { name: "Mozzarella, Tomato & Pesto Panini", price: "Toasted to order" },
  { name: "Single-origin filter coffee", price: "Rotating beans" },
];

const TAGS = ["Free WiFi", "Dog friendly", "Vegan options throughout", "Open 7 days a week"];

const CHIPS = [
  { stat: "HTTPS ✕", label: "the secure address every browser defaults to fails with a certificate error" },
  { stat: "484", label: "Google reviews averaging 4.2 out of 5 — reached mostly via Google, not their own site" },
  { stat: "24/7", label: "an assistant could answer hours & menu questions, cafe open or not" },
];

function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayVal(value);
      return;
    }
    const start = performance.now();
    const duration = 1400;
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="tabular-nums">
      {displayVal.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Abstract tide lines — concentric, gently drifting wave arcs. A dual
// nod to the business name and to ripples in a cup, kept entirely
// abstract rather than any literal maritime cliché.
function TideLinesMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      <g className="motif-anim [animation:motif-spin_70s_linear_infinite]" style={{ transformOrigin: "300px 300px" }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const r = 60 + i * 32;
          return (
            <circle
              key={i}
              cx="300"
              cy="300"
              r={r}
              fill="none"
              stroke="#5cb8a0"
              strokeWidth="2"
              opacity={0.16 - (i % 3) * 0.02}
            />
          );
        })}
      </g>
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello! I'm Offshore's AI assistant. Ask me anything.";
const SUGGESTED = ["What time do you open?", "Is there vegan food?", "Can I bring my dog?"];

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
      const res = await fetch("/api/concepts/offshore-coffee/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2c5068] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2c5068] bg-[#081a28] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#5cb8a0]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-[#8fb2c4] uppercase">Offshore — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#0b2436] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#5cb8a0] px-3 py-2 text-sm text-[#0b2436]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#123249] px-3 py-2 text-sm whitespace-pre-line text-[#f3ede0]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#123249] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#8fb2c4] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8fb2c4] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8fb2c4]" />
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
                className="rounded-full border border-[#2c5068] px-3 py-1.5 text-xs text-[#8fb2c4] transition-colors hover:border-[#5cb8a0] hover:text-[#f3ede0]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2c5068] bg-[#081a28] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2c5068] bg-[#0b2436] px-3 text-sm text-[#f3ede0] outline-none placeholder:text-[#4d7185] focus-visible:border-[#5cb8a0]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#5cb8a0] text-[#0b2436] transition-colors hover:bg-[#79c7b3] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function OffshoreCoffeeConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#0b2436] text-[#f3ede0]`}
      style={{ fontFamily: "var(--font-off-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#081a28] px-4 py-1.5 text-center text-[11px] text-[#8fb2c4]">
        <span>
          Concept by <span className="text-[#f3ede0]">Hamish AI</span> for{" "}
          <span className="text-[#f3ede0]">Offshore Coffee</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f3ede0] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#0b2436]">
        <Image
          src="/images/concepts/offshore-coffee/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b2436] via-[#0b2436]/90 to-[#0b2436]/60" />
        <TideLinesMotif className="pointer-events-none absolute top-1/2 right-[-8%] size-[700px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5cb8a0] text-lg font-bold text-[#0b2436]"
                style={{ fontFamily: "var(--font-off-display)" }}
                aria-hidden
              >
                O
              </span>
              <span
                className="text-2xl font-semibold tracking-tight text-[#f3ede0]"
                style={{ fontFamily: "var(--font-off-display)" }}
              >
                Offshore
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#c9a463] uppercase">
              Gibson Street · Glasgow West End
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-off-display)" }}
            >
              A 4.2 from 484 people.
              <br />
              <span className="text-[#5cb8a0]">The window seat over the Kelvin is free.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#8fb2c4]">
              Single-origin espresso and filter coffee, big windows, and a no-fuss West End welcome — dog at your feet optional.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f3ede0]/80 hover:text-[#f3ede0]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#2c5068]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-off-display)" }}
              >
                <AnimatedNumber value={4.2} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#8fb2c4] uppercase">Google rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-off-display)" }}
              >
                <AnimatedNumber value={484} />
              </p>
              <p className="mt-1 text-[11px] text-[#8fb2c4] uppercase">Reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-off-display)" }}>
                7 days
              </p>
              <p className="mt-1 text-[11px] text-[#8fb2c4] uppercase">Open every week</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* On the menu */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#5cb8a0] uppercase">On the menu</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "var(--font-off-display)" }}>
            Coffee, bagels and homemade bakes.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#2c5068] bg-[#123249]">
            {MENU.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${i > 0 ? "border-t border-[#2c5068]" : ""}`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="tabular-nums text-[#8fb2c4]">{m.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#6a8ea3]">
            Sample dishes and prices as listed on menu aggregators — the full menu changes regularly.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#2c5068] bg-[#123249] px-3 py-1.5 text-xs text-[#8fb2c4]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment — their own words, not a fabricated review */}
      <section className="relative overflow-hidden bg-[#5cb8a0] px-6 py-24 text-[#0b2436]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-off-display)" }}
          >
            &ldquo;A local no-fuss coffee shop with a very relaxed atmosphere.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Offshore Coffee, in their own words
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#081a28] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a463] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-off-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#5cb8a0] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2c5068] bg-[#123249] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-off-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#8fb2c4]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#6a8ea3]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest coffee-run hours, most-asked menu questions, dine-in vs. takeaway
            split — illustrative, not Offshore&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2c5068] bg-[#0b2436] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-off-display)" }}
          >
            Coffee this loved deserves an address that actually loads.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#5cb8a0] underline underline-offset-4 hover:text-[#79c7b3]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#081a28] px-6 pb-10 pt-8 text-center text-[11px] text-[#6a8ea3]">
        Offshore Coffee · 3-5 Gibson Street, Glasgow, G12 8NU
        <br />
        Built from publicly available information only — not affiliated with or published by Offshore Coffee.
      </footer>
    </div>
  );
}
