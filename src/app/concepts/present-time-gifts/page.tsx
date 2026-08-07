"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Quicksand, Karla } from "next/font/google";
import { Send, Gift, Sparkles, Heart, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Quicksand is a warm,
// rounded display face — a gift-shop window, not a corporate one; Karla
// carries the body plainly and legibly.
const display = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-pt-display",
});
const body = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-pt-body",
});

const BRANDS = ["Katie Loxton", "Joma Jewellery", "Willow Tree", "Charlie Bears", "Coeur de Lion", "Carrie Elspeth"];

const CHIPS = [
  { stat: "0", label: "products, hours, or contact details showing on their own domain today" },
  { stat: "2000", label: "the year the shop first opened on North Bridge Street" },
  { stat: "24/7", label: "an assistant could be answering \"do you stock X\" questions, domain parked or not" },
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

// A looping ribbon-and-bow line motif — gift wrap, not a literal photo of
// any specific product. The loop gently unspools and re-ties.
function RibbonMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      <path
        d="M60 500 C180 460 160 340 300 340 C440 340 420 460 540 500"
        stroke="#e8845a"
        strokeWidth="3"
        className="motif-anim [animation:motif-cascade_6s_ease-in-out_infinite]"
        style={{ "--motif-opacity-min": 0.08, "--motif-opacity-max": 0.32 } as React.CSSProperties}
      />
      <circle
        cx="300"
        cy="300"
        r="60"
        stroke="#8faa8a"
        strokeWidth="3"
        className="motif-anim [animation:motif-ripple_6s_ease-out_infinite]"
        style={{ transformOrigin: "300px 300px", "--motif-opacity-max": 0.4, animationDelay: "1.5s" } as React.CSSProperties}
      />
      <circle
        cx="300"
        cy="300"
        r="60"
        stroke="#8faa8a"
        strokeWidth="3"
        className="motif-anim [animation:motif-ripple_6s_ease-out_infinite]"
        style={{ transformOrigin: "300px 300px", "--motif-opacity-max": 0.4, animationDelay: "4.5s" } as React.CSSProperties}
      />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Present Time's AI assistant. Ask me anything.";
const SUGGESTED = ["Do you stock Katie Loxton?", "Where are you based?", "Do you do gift wrapping?"];

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
      const res = await fetch("/api/concepts/present-time-gifts/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#e6d9cf] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#e6d9cf] bg-[#f3e6da] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#e8845a]/60" />
        <span className="size-2.5 rounded-full bg-[#8faa8a]/60" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#8a7364] uppercase">
          Present Time — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#faf3ee] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8845a] px-3 py-2 text-sm text-[#faf3ee]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f3e6da] px-3 py-2 text-sm whitespace-pre-line text-[#3a2e26]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#f3e6da] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#8a7364] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8a7364] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8a7364]" />
            </span>
          </div>
        )}
        {error && (
          <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-red-100 px-3 py-2 text-sm text-red-800">
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
                className="rounded-full border border-[#e6d9cf] px-3 py-1.5 text-xs text-[#8a7364] transition-colors hover:border-[#e8845a] hover:text-[#3a2e26]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#e6d9cf] bg-[#f3e6da] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#e6d9cf] bg-[#faf3ee] px-3 text-sm text-[#3a2e26] outline-none placeholder:text-[#b3a294] focus-visible:border-[#e8845a]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e8845a] text-[#faf3ee] transition-colors hover:bg-[#ee9974] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function PresentTimeGiftsConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#faf3ee] text-[#3a2e26]`}
      style={{ fontFamily: "var(--font-pt-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#f3e6da] px-4 py-1.5 text-center text-[11px] text-[#8a7364]">
        <span>
          Concept by <span className="text-[#3a2e26]">Hamish AI</span> for{" "}
          <span className="text-[#3a2e26]">Present Time Gifts &amp; Cards</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#3a2e26] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero — dark override, matching every other concept page's photo hero regardless of the page's own light body colour */}
      <section className="relative isolate overflow-hidden bg-[#2b241f] text-[#faf3ee]">
        <Image
          src="/images/concepts/present-time-gifts/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2b241f] via-[#2b241f]/88 to-[#2b241f]/50" />
        <RibbonMotif className="pointer-events-none absolute top-1/2 right-[-8%] size-[600px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e8845a] text-lg font-bold text-[#2b241f]"
                style={{ fontFamily: "var(--font-pt-display)" }}
                aria-hidden
              >
                PT
              </span>
              <span
                className="text-2xl font-semibold tracking-tight text-[#faf3ee]"
                style={{ fontFamily: "var(--font-pt-display)" }}
              >
                Present Time
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#e8845a] uppercase">
              North Bridge Street · Bathgate
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-pt-display)" }}
            >
              A quarter-century of gifts,
              <br />
              <span className="text-[#e8845a]">and a domain that&apos;s for sale.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#d9c3af]">
              Family-run since 2000, stocking the brands people actually ask for by name.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#faf3ee]/80 hover:text-[#faf3ee]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#4a3f36]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-pt-display)" }}>
                2000
              </p>
              <p className="mt-1 text-[11px] text-[#d9c3af] uppercase">Opened</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-pt-display)" }}>
                94%
              </p>
              <p className="mt-1 text-[11px] text-[#d9c3af] uppercase">Recommend, 13 reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-pt-display)" }}>
                Family-run
              </p>
              <p className="mt-1 text-[11px] text-[#d9c3af] uppercase">Since day one</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* In the shop */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#e8845a] uppercase">In the shop</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "var(--font-pt-display)" }}>
            Official stockist of the brands people come in asking for.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 flex flex-wrap gap-2">
            {BRANDS.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e6d9cf] bg-[#f3e6da] px-3 py-1.5 text-xs text-[#8a7364]"
              >
                <Sparkles className="size-3 text-[#e8845a]" />
                {b}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#b3a294]">
            Also jewellery, homeware, greeting cards, and gift wrapping — as listed on their Facebook page.
          </p>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#e8845a] px-6 py-24 text-[#2b241f]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-pt-display)" }}
          >
            &ldquo;Happy, knowledgeable staff who know what they&apos;re talking about.&rdquo;
          </blockquote>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            <Heart className="size-3.5" />
            Customer review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#f3e6da] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e8845a] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-pt-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#e8845a] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e6d9cf] bg-[#f3e6da] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-pt-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#8a7364]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#b3a294]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — most-asked-about brands, gift-wrap requests, footfall by season —
            illustrative, not Present Time&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#e6d9cf] bg-[#faf3ee] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-pt-display)" }}
          >
            Twenty-five years of gifts deserves a shop window online too.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#e8845a] underline underline-offset-4 hover:text-[#ee9974]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#f3e6da] px-6 pb-10 pt-8 text-center text-[11px] text-[#b3a294]">
        <span className="inline-flex items-center gap-1">
          <Gift className="size-3" />
          Present Time Gifts &amp; Cards · 88 North Bridge Street, Bathgate, EH48 4PN
        </span>
        <br />
        Built from publicly available information only — not affiliated with or published by Present Time Gifts
        &amp; Cards.
      </footer>
    </div>
  );
}
