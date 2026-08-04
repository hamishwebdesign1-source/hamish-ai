"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Yeseva_One, Figtree } from "next/font/google";
import { Send, Cake, Soup, Heart, MapPin, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Yeseva One is a bold
// display serif with quirky, rounded ball terminals — genuine 1970s
// tea-room packaging character, the exact decade this cafe opened;
// Figtree carries the body copy with a warm, rounded sans.
const display = Yeseva_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-neuk-display",
});
const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-neuk-body",
});

const HIGHLIGHTS = [
  { icon: Cake, title: "Home-baked cakes", body: "Made the same way since 1972" },
  { icon: Soup, title: "Salads & stovies", body: "Fresh, prepared daily" },
  { icon: Heart, title: "Warm hospitality", body: "Families and dietary needs, always welcome" },
  { icon: MapPin, title: "Heart of Linlithgow", body: "11 The Cross, town centre" },
];

const CHIPS = [
  { stat: "0", label: "pages of their own website — only Facebook and directory listings" },
  { stat: "1972", label: "the year this family-run cafe first opened" },
  { stat: "24/7", label: "an assistant could be answering, cafe open or not" },
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

// A scalloped awning edge — evokes an old high-street cafe frontage,
// kept from the original build and recoloured to the new palette.
function AwningMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 200" className={className} aria-hidden preserveAspectRatio="xMidYMin slice">
      {Array.from({ length: 10 }).map((_, i) => (
        <path
          key={i}
          d={`M${i * 60} 0 A30 30 0 0 0 ${i * 60 + 60} 0 Z`}
          fill={i % 2 === 0 ? "#c1552e" : "#7a8a4a"}
          opacity={0.18}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm The Coffee Neuk's AI assistant. Ask me anything.";
const SUGGESTED = ["What's good to order?", "Are you family-friendly?", "Where are you based?"];

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
      const res = await fetch("/api/concepts/coffee-neuk/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#4a3820] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#4a3820] bg-[#150f08] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c1552e]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-[#c4b394] uppercase">
          The Coffee Neuk — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#221a10] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c1552e] px-3 py-2 text-sm text-[#f8f0dd]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#332617] px-3 py-2 text-sm whitespace-pre-line text-[#f8f0dd]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#332617] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#c4b394] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c4b394] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c4b394]" />
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
                className="rounded-full border border-[#4a3820] px-3 py-1.5 text-xs text-[#c4b394] transition-colors hover:border-[#c1552e] hover:text-[#f8f0dd]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#4a3820] bg-[#150f08] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#4a3820] bg-[#221a10] px-3 text-sm text-[#f8f0dd] outline-none placeholder:text-[#7a6a4f] focus-visible:border-[#c1552e]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c1552e] text-[#f8f0dd] transition-colors hover:bg-[#d1663e] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function CoffeeNeukConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#f8f4e8] text-[#221a10]`}
      style={{ fontFamily: "var(--font-neuk-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#150f08] px-4 py-1.5 text-center text-[11px] text-[#c4b394]">
        <span>
          Concept by <span className="text-[#f8f0dd]">Hamish AI</span> for{" "}
          <span className="text-[#f8f0dd]">The Coffee Neuk</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f8f0dd] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#221a10] text-[#f8f0dd]">
        <Image
          src="/images/concepts/coffee-neuk/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#221a10] via-[#221a10]/90 to-[#221a10]/55" />
        <AwningMotif className="pointer-events-none absolute inset-x-0 top-0 h-[160px] w-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-24 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#c1552e] text-base text-[#f8f0dd]"
                style={{ fontFamily: "var(--font-neuk-display)" }}
                aria-hidden
              >
                CN
              </span>
              <span
                className="text-2xl text-[#f8f0dd]"
                style={{ fontFamily: "var(--font-neuk-display)" }}
              >
                The Coffee Neuk
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#e08355] uppercase">
              Linlithgow · West Lothian
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.1] text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-neuk-display)" }}
            >
              Fifty years of home-baking,
              <br />
              <span className="text-[#9cae6d]">in the heart of Linlithgow.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#c4b394]">
              Family-run since 1972 — cosy, welcoming, and loved by generations of regulars.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f8f0dd]/80 hover:text-[#f8f0dd]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#4a3820]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl" style={{ fontFamily: "var(--font-neuk-display)" }}>
                1972
              </p>
              <p className="mt-1 text-[11px] text-[#c4b394] uppercase">Established</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl tabular-nums" style={{ fontFamily: "var(--font-neuk-display)" }}>
                <AnimatedNumber value={54} />
              </p>
              <p className="mt-1 text-[11px] text-[#c4b394] uppercase">Years trading</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl" style={{ fontFamily: "var(--font-neuk-display)" }}>
                Family-run
              </p>
              <p className="mt-1 text-[11px] text-[#c4b394] uppercase">From day one</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8f3c1e] uppercase">What people love</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.title} delay={i * 80}>
              <div className="group h-full rounded-xl border border-[#e8dcc0] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#c1552e] hover:shadow-xl">
                <h.icon className="size-6 text-[#8f3c1e] transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-4 text-lg" style={{ fontFamily: "var(--font-neuk-display)" }}>
                  {h.title}
                </p>
                <p className="mt-1.5 text-sm text-[#5c4d33]">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* A moment, not a quote — no single verbatim reviewer line was
          confirmed for this business, so this states the aggregate
          sentiment plainly rather than fabricating an attributed quote. */}
      <section className="relative overflow-hidden bg-[#7a8a4a] px-6 py-24 text-[#221a10]">
        <Reveal>
          <p
            className="mx-auto max-w-3xl text-center text-3xl leading-tight text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-neuk-display)" }}
          >
            Home-baking and a warm welcome, in the heart of Linlithgow since 1972.
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#150f08] px-6 py-24 text-[#f8f0dd]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e08355] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl md:text-4xl" style={{ fontFamily: "var(--font-neuk-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#525e31] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e8dcc0] bg-white p-6">
                <p className="text-3xl" style={{ fontFamily: "var(--font-neuk-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#5c4d33]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a7a5f]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest hours, best-selling bakes, repeat-visit rate — illustrative, not
            The Coffee Neuk&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#4a3820] bg-[#221a10] px-6 py-24 text-center text-[#f8f0dd]">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-neuk-display)" }}
          >
            Fifty years of home-baking deserves to be findable.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#e08355] underline underline-offset-4 hover:text-[#e6935f]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#150f08] px-6 pb-10 pt-8 text-center text-[11px] text-[#8a7a5f]">
        The Coffee Neuk · 11 The Cross, Linlithgow, West Lothian, EH49 7AH
        <br />
        Built from publicly available information only — not affiliated with or published by The Coffee Neuk.
      </footer>
    </div>
  );
}
