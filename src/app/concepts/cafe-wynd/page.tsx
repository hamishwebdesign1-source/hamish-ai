"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bitter, Karla } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only — not the site's shared
// Fraunces/mono, and not shared with C4 Joinery or McDowall. Bitter is a
// warm printed-menu-board slab serif; Karla is a rounded, friendly
// grotesque for body copy.
const display = Bitter({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-wynd-display",
});
const body = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-wynd-body",
});

const MENU = [
  { name: "Huevos rancheros", price: "Brunch" },
  { name: "Sourdough toast, poached egg or avocado", price: "Brunch" },
  { name: "Waffles with bacon", price: "Brunch" },
  { name: "Reuben sandwich", price: "Lunch" },
];

const TAGS = ["Locally roasted coffee", "Gluten-free & vegan friendly", "Dog-friendly — every dog gets a treat", "Walk-ins only, no booking"];

const CHIPS = [
  { stat: "0", label: "pages of their own website — only Facebook and directory listings" },
  { stat: "#11", label: "of 190 restaurants in Dunfermline, per Tripadvisor" },
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

// Coffee-ring stains in sage — ties to the real menu (avocado toast,
// vegan-friendly) rather than a generic "warm cafe brown" motif. Each
// ring ripples outward on its own slow cycle, like a fresh mark spreading.
function RingMotif({ className }: { className?: string }) {
  const rings = [
    { cx: 220, cy: 200, r: 140, stroke: "#8aa06a", width: 10, delay: 0 },
    { cx: 380, cy: 340, r: 100, stroke: "#8aa06a", width: 8, delay: 1.8 },
    { cx: 300, cy: 440, r: 60, stroke: "#d97b3f", width: 6, delay: 0.9 },
    { cx: 140, cy: 380, r: 45, stroke: "#d97b3f", width: 5, delay: 2.7 },
  ];
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {rings.map((c, i) => (
        <circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="none"
          stroke={c.stroke}
          strokeWidth={c.width}
          className="motif-anim [animation:motif-ripple_7s_ease-out_infinite]"
          style={{ transformOrigin: `${c.cx}px ${c.cy}px`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Cafe Wynd's AI assistant. Ask me anything.";
const SUGGESTED = ["What's on the menu?", "Are you dog-friendly?", "Do I need to book?"];

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
      const res = await fetch("/api/concepts/cafe-wynd/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#4a3826] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#4a3826] bg-[#2f2015] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#d97b3f]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#c2ab90] uppercase">Cafe Wynd — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#1c130d] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#8aa06a] px-3 py-2 text-sm text-[#1c130d]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#2f2015] px-3 py-2 text-sm whitespace-pre-line text-[#faf3e8]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#2f2015] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#c2ab90] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c2ab90] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c2ab90]" />
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
                className="rounded-full border border-[#4a3826] px-3 py-1.5 text-xs text-[#c2ab90] transition-colors hover:border-[#8aa06a] hover:text-[#faf3e8]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#4a3826] bg-[#2f2015] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#4a3826] bg-[#1c130d] px-3 text-sm text-[#faf3e8] outline-none placeholder:text-[#7a6551] focus-visible:border-[#8aa06a]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#8aa06a] text-[#1c130d] transition-colors hover:bg-[#9bb37c] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function CafeWyndConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#241811] text-[#faf3e8]`}
      style={{ fontFamily: "var(--font-wynd-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#1c130d] px-4 py-1.5 text-center text-[11px] text-[#c2ab90]">
        <span>
          Concept by <span className="text-[#faf3e8]">Hamish AI</span> for{" "}
          <span className="text-[#faf3e8]">Cafe Wynd</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#faf3e8] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#241811]">
        <Image
          src="/images/concepts/cafe-wynd/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#241811] via-[#241811]/92 to-[#241811]/60" />
        <RingMotif className="pointer-events-none absolute top-1/2 right-[-8%] size-[600px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-[#d97b3f] text-lg font-bold text-[#d97b3f]"
                style={{ fontFamily: "var(--font-wynd-display)" }}
                aria-hidden
              >
                W
              </span>
              <span
                className="text-2xl font-extrabold tracking-tight text-[#faf3e8]"
                style={{ fontFamily: "var(--font-wynd-display)" }}
              >
                Cafe Wynd
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#d97b3f] uppercase">
              Dunfermline · Fife
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-bold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-wynd-display)" }}
            >
              Dunfermline&apos;s favourite
              <br />
              <span className="text-[#8aa06a]">independent cafe.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#c2ab90]">
              Locally roasted coffee, homemade bakes, and a treat for every dog that walks in — ranked #11 of 190
              restaurants in town.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#faf3e8]/80 hover:text-[#faf3e8]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#4a3826]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ fontFamily: "var(--font-wynd-display)" }}
              >
                <AnimatedNumber value={4.7} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#c2ab90] uppercase">Tripadvisor rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ fontFamily: "var(--font-wynd-display)" }}
              >
                <AnimatedNumber value={815} />
              </p>
              <p className="mt-1 text-[11px] text-[#c2ab90] uppercase">Restaurant Guru reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-wynd-display)" }}>
                #11 / 190
              </p>
              <p className="mt-1 text-[11px] text-[#c2ab90] uppercase">Restaurants in Dunfermline</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* On the menu */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#d97b3f] uppercase">On the menu</p>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl" style={{ fontFamily: "var(--font-wynd-display)" }}>
            What people order, again and again.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#4a3826] bg-[#2f2015]">
            {MENU.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${i > 0 ? "border-t border-[#4a3826]" : ""}`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="tabular-nums text-[#c2ab90]">{m.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8a7663]">
            Brunch and lunch typically run £10–£20 per person — the full menu changes seasonally.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#4a3826] bg-[#2f2015] px-3 py-1.5 text-xs text-[#c2ab90]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#8aa06a] px-6 py-24 text-[#1c130d]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-bold text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-wynd-display)" }}
          >
            &ldquo;The only dog-friendly place I could find in the whole of Dunfermline.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Tripadvisor review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#1c130d] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#d97b3f] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--font-wynd-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#d97b3f] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#4a3826] bg-[#2f2015] p-6">
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-wynd-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#c2ab90]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a7663]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest hours, repeat-visit rate, most-asked questions — illustrative,
            not Cafe Wynd&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#4a3826] bg-[#241811] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-bold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-wynd-display)" }}
          >
            A cafe this loved deserves to be found.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#d97b3f] underline underline-offset-4 hover:text-[#e6935f]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#1c130d] px-6 pb-10 pt-8 text-center text-[11px] text-[#8a7663]">
        Cafe Wynd · 10 Cross Wynd, Dunfermline, Fife, KY12 7AP
        <br />
        Built from publicly available information only — not affiliated with or published by Cafe Wynd.
      </footer>
    </div>
  );
}
