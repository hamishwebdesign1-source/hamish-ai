"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fredoka, Mulish } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Fredoka is a rounded,
// joyful geometric display face — warmth and energy without leaning on
// any literal cultural cliché; Mulish carries the body copy.
const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-orin-display",
});
const body = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-orin-body",
});

const MENU = [
  { name: "Arepa Pabellón", price: "£11" },
  { name: "Arepa Catira", price: "£10" },
  { name: "Empanadas (cheese)", price: "£4" },
  { name: "Cachapas", price: "Fresh corn pancakes" },
];

const TAGS = ["Gluten-free options across most of the menu", "~£6 average per dish", "Ordered via Deliveroo & social media"];

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

// An abstract radiating sun-ray burst, kept from the original build and
// recoloured to gold — warmth and energy without any literal cultural
// symbol.
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
            stroke="#f0b429"
            strokeWidth="3"
            opacity={0.14 - (i % 3) * 0.02}
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
    <div className="overflow-hidden rounded-xl border border-[#235058] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#235058] bg-[#0c2529] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#f0b429]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-[#9dc1c4] uppercase">Orinoco — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#0f2e33] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#f0b429] px-3 py-2 text-sm text-[#0f2e33]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#163d43] px-3 py-2 text-sm whitespace-pre-line text-[#fdf6e8]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#163d43] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9dc1c4] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9dc1c4] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9dc1c4]" />
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
                className="rounded-full border border-[#235058] px-3 py-1.5 text-xs text-[#9dc1c4] transition-colors hover:border-[#f0b429] hover:text-[#fdf6e8]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#235058] bg-[#0c2529] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#235058] bg-[#0f2e33] px-3 text-sm text-[#fdf6e8] outline-none placeholder:text-[#5f8388] focus-visible:border-[#f0b429]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#f0b429] text-[#0f2e33] transition-colors hover:bg-[#f4c452] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function OrinocoLatinFoodConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#0f2e33] text-[#fdf6e8]`}
      style={{ fontFamily: "var(--font-orin-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#0c2529] px-4 py-1.5 text-center text-[11px] text-[#9dc1c4]">
        <span>
          Concept by <span className="text-[#fdf6e8]">Hamish AI</span> for{" "}
          <span className="text-[#fdf6e8]">Orinoco Latin Food</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#fdf6e8] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#0f2e33]">
        <Image
          src="/images/concepts/orinoco-latin-food/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2e33] via-[#0f2e33]/90 to-[#0f2e33]/55" />
        <RaysMotif className="pointer-events-none absolute top-1/2 right-[-10%] size-[700px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0b429] text-lg font-bold text-[#0f2e33]"
                style={{ fontFamily: "var(--font-orin-display)" }}
                aria-hidden
              >
                O
              </span>
              <span
                className="text-2xl font-semibold tracking-tight text-[#fdf6e8]"
                style={{ fontFamily: "var(--font-orin-display)" }}
              >
                Orinoco
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#ee6a52] uppercase">
              Leith Walk · Edinburgh
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-orin-display)" }}
            >
              Arepas and empanadas
              <br />
              <span className="text-[#f0b429]">Leith Walk keeps coming back for.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#9dc1c4]">
              Empanadas and arepas that earn a 4.9 average, at around £6 a dish.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#fdf6e8]/80 hover:text-[#fdf6e8]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#235058]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-orin-display)" }}
              >
                <AnimatedNumber value={4.9} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#9dc1c4] uppercase">Average rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-orin-display)" }}
              >
                <AnimatedNumber value={509} />
              </p>
              <p className="mt-1 text-[11px] text-[#9dc1c4] uppercase">Reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-orin-display)" }}>
                ~£6
              </p>
              <p className="mt-1 text-[11px] text-[#9dc1c4] uppercase">Average per dish</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* On the menu */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#f0b429] uppercase">On the menu</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "var(--font-orin-display)" }}>
            The dishes reviewers rave about.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#235058] bg-[#163d43]">
            {MENU.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${i > 0 ? "border-t border-[#235058]" : ""}`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="tabular-nums text-[#9dc1c4]">{m.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#7fa3a6]">
            Sample dishes and prices as listed on delivery platforms — the full menu changes regularly.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#235058] bg-[#163d43] px-3 py-1.5 text-xs text-[#9dc1c4]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#f0b429] px-6 py-24 text-[#0f2e33]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-orin-display)" }}
          >
            &ldquo;One of my go-to spots for a quick, authentic meal.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Customer review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#0c2529] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#ee6a52] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-orin-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#f0b429] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#235058] bg-[#163d43] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-orin-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#9dc1c4]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#7fa3a6]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest order windows, most-ordered dishes, delivery vs. walk-in split —
            illustrative, not Orinoco&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#235058] bg-[#0f2e33] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-orin-display)" }}
          >
            Food this loved deserves a front door of its own.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#f0b429] underline underline-offset-4 hover:text-[#f4c452]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#0c2529] px-6 pb-10 pt-8 text-center text-[11px] text-[#7fa3a6]">
        Orinoco Latin Food · 281 Leith Walk, Edinburgh, EH6 8PD
        <br />
        Built from publicly available information only — not affiliated with or published by Orinoco Latin Food.
      </footer>
    </div>
  );
}
