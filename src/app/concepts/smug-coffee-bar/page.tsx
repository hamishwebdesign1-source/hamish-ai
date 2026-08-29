"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bricolage_Grotesque, Sora } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only — not shared with any other
// concept page. Bricolage Grotesque is a warm, slightly wonky display
// grotesque with genuine personality (fitting a cafe whose whole name is a
// wink at its own confidence); Sora carries the body copy.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-smug-display",
});
const body = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-smug-body",
});

const MENU = [
  { name: "Bagel sandwiches — hummus & roasted veg, pastrami Swiss, salmon & cream cheese, tex mex", price: "~£5" },
  { name: "Medium skinny latte (takeaway)", price: "~£1.70" },
  { name: "Chai tea latte / S'mug Fog", price: "Reviewer favourite" },
  { name: "Soup of the day — lentil, or tomato & red pepper", price: "Daily" },
  { name: "Blueberry cheesecake & vanilla Portuguese cakes", price: "Baked in-house" },
  { name: "Milkshakes & smoothies", price: "Oreo, Reese's & more" },
];

const TAGS = [
  "5 plant-based milks, vegan syrups",
  "£2 takeaway drinks with student ID",
  "Wheelchair accessible · outdoor seating · WiFi",
];

const CHIPS = [
  { stat: "0", label: "smugcoffeebar.co.uk doesn't resolve at all right now — a dead end online" },
  { stat: "8–5:30", label: "weekday hours nobody can double-check without calling" },
  { stat: "24/7", label: "an assistant could be answering that gap, day or night" },
];

function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }
    const start = performance.now();
    const duration = 1400;
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="tabular-nums">
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Three curling wisps of steam rising off a cup — abstract, not a literal
// cup illustration — with a slow dash-crawl so they read as drifting rather
// than static lines. Not reused from any other concept page.
function SteamMotif({ className }: { className?: string }) {
  const curls = [
    { d: "M 190 560 C 165 480 225 445 200 365 C 175 285 235 250 210 170", opacity: 0.16 },
    { d: "M 300 570 C 275 490 335 455 310 375 C 285 295 345 260 320 180", opacity: 0.22 },
    { d: "M 410 560 C 385 480 445 445 420 365 C 395 285 455 250 430 170", opacity: 0.16 },
  ];
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      {curls.map((c, i) => (
        <path
          key={i}
          d={c.d}
          stroke="#b6a3e8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="10 8"
          opacity={c.opacity}
          className="motif-anim [animation:motif-dash-crawl_3.4s_linear_infinite]"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hiya! I'm SMUG's AI assistant. Ask me anything.";
const SUGGESTED = ["What's good on the menu?", "Any vegan options?", "Where are you?"];

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
      const res = await fetch("/api/concepts/smug-coffee-bar/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2c2438] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2c2438] bg-[#171220] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#8b6fd6]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-[#a99bc4] uppercase">SMUG — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#201a2c] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#8b6fd6] px-3 py-2 text-sm text-[#171220]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#2c2438] px-3 py-2 text-sm whitespace-pre-line text-[#f5f0e4]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#2c2438] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#a99bc4] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a99bc4] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a99bc4]" />
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
                className="rounded-full border border-[#2c2438] px-3 py-1.5 text-xs text-[#a99bc4] transition-colors hover:border-[#8b6fd6] hover:text-[#f5f0e4]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2c2438] bg-[#171220] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2c2438] bg-[#201a2c] px-3 text-sm text-[#f5f0e4] outline-none placeholder:text-[#6b5f7a] focus-visible:border-[#8b6fd6]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#8b6fd6] text-[#171220] transition-colors hover:bg-[#b6a3e8] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function SmugCoffeeBarConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#171220] text-[#f5f0e4]`}
      style={{ fontFamily: "var(--font-smug-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#120e19] px-4 py-1.5 text-center text-[11px] text-[#a99bc4]">
        <span>
          Concept by <span className="text-[#f5f0e4]">Hamish AI</span> for{" "}
          <span className="text-[#f5f0e4]">SMUG Coffee Bar</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f5f0e4] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#171220]">
        <Image
          src="/images/concepts/smug-coffee-bar/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171220] via-[#171220]/90 to-[#171220]/60" />
        <SteamMotif className="pointer-events-none absolute top-1/2 right-[-6%] size-[620px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#8b6fd6] text-lg font-bold text-[#171220]"
                style={{ fontFamily: "var(--font-smug-display)" }}
                aria-hidden
              >
                S
              </span>
              <span
                className="text-2xl font-semibold tracking-tight text-[#f5f0e4]"
                style={{ fontFamily: "var(--font-smug-display)" }}
              >
                SMUG
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#b6a3e8] uppercase">
              Great George Street · Glasgow West End
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-smug-display)" }}
            >
              A little smug about the espresso.
              <br />
              <span className="text-[#8b6fd6]">Rightly so.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#a99bc4]">
              Proper coffee and unfussy brunch off Byres Road — the kind of place regulars
              call their current favourite, not just their nearest.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f5f0e4]/80 hover:text-[#f5f0e4]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#2c2438]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-smug-display)" }}
              >
                <AnimatedNumber value={4.3} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#a99bc4] uppercase">Google rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p
                className="text-2xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-smug-display)" }}
              >
                <AnimatedNumber value={999} />
              </p>
              <p className="mt-1 text-[11px] text-[#a99bc4] uppercase">Instagram followers</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-smug-display)" }}>
                2009
              </p>
              <p className="mt-1 text-[11px] text-[#a99bc4] uppercase">Serving Great George St since</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* On the menu */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8b6fd6] uppercase">On the menu</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "var(--font-smug-display)" }}>
            Bagels, brunch and better coffee.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#2c2438] bg-[#201a2c]">
            {MENU.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${i > 0 ? "border-t border-[#2c2438]" : ""}`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="shrink-0 tabular-nums text-[#a99bc4]">{m.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#6b5f7a]">
            Menu items and prices as listed on review platforms — the full board changes regularly.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#2c2438] bg-[#201a2c] px-3 py-1.5 text-xs text-[#a99bc4]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#8b6fd6] px-6 py-24 text-[#171220]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-smug-display)" }}
          >
            &ldquo;The coffee was very good and of a decent strength too.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Yelp review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#120e19] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#b6a3e8] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-smug-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8b6fd6] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2c2438] bg-[#201a2c] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-smug-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#a99bc4]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#6b5f7a]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest order windows, most-ordered menu items, dine-in vs. takeaway
            split — illustrative, not SMUG&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2c2438] bg-[#171220] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-smug-display)" }}
          >
            Seventeen years of regulars deserve a website that actually loads.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#8b6fd6] underline underline-offset-4 hover:text-[#b6a3e8]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#120e19] px-6 pb-10 pt-8 text-center text-[11px] text-[#6b5f7a]">
        SMUG Coffee Bar · 167 Great George Street, Glasgow, G12 8AQ
        <br />
        Built from publicly available information only — not affiliated with or published by SMUG Coffee Bar.
      </footer>
    </div>
  );
}
