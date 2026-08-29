"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Bodoni Moda is a
// high-contrast editorial serif — glossy, glam, a little theatrical —
// for a salon that also runs its own training academy; Plus Jakarta Sans
// carries the body cleanly.
const display = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-purdies-display",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-purdies-body",
});

const TREATMENTS = [
  { name: "Colour", price: "French Balayage, iNOA, Dia Color, Majirel" },
  { name: "Cut & Finish", price: "Including the Glass Hair glossing service" },
  { name: "Nails", price: "Gel & acrylic" },
  { name: "Lash Extensions", price: "Full sets & infills" },
  { name: "Brows", price: "Also taught in-house at the training academy" },
  { name: "Spray Tan", price: "Private tanning area — DM \"TAN\" to book" },
];

const TAGS = [
  "Licensed bar — a drink while you're in the chair",
  "Aesthetics & skin tag removal also offered",
  "Booked by phone or Instagram DM — no booking site yet",
];

const CHIPS = [
  { stat: "0", label: "pages of their own — Facebook and Instagram are the whole online presence today" },
  { stat: "1,019", label: "Instagram followers with no website to click through to" },
  { stat: "24/7", label: "an assistant could be answering treatment questions, salon open or not" },
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

// Rising champagne bubbles of varying size — a nod to the salon's real
// licensed bar, kept abstract rather than a literal glass or bottle.
function BubblesMotif({ className }: { className?: string }) {
  const bubbles = [
    { cx: 220, cy: 480, r: 10, delay: 0 },
    { cx: 300, cy: 420, r: 16, delay: 0.8 },
    { cx: 260, cy: 320, r: 7, delay: 1.6 },
    { cx: 360, cy: 500, r: 12, delay: 0.4 },
    { cx: 400, cy: 380, r: 20, delay: 1.2 },
    { cx: 340, cy: 220, r: 9, delay: 2 },
    { cx: 430, cy: 260, r: 13, delay: 0.6 },
    { cx: 300, cy: 150, r: 6, delay: 1.8 },
  ];
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      {bubbles.map((b, i) => (
        <circle
          key={i}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          stroke="#e0bb6c"
          strokeWidth="1.5"
          className="motif-anim [animation:motif-ripple_6s_ease-out_infinite]"
          style={{ transformOrigin: `${b.cx}px ${b.cy}px`, "--motif-opacity-max": 0.4, animationDelay: `${b.delay}s` } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Purdie's AI assistant. Ask me anything.";
const SUGGESTED = ["What treatments do you offer?", "How do I book?", "Do you really have a bar?"];

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
      const res = await fetch("/api/concepts/purdies-hair-and-beauty/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#4a2a38] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#4a2a38] bg-[#1c0f14] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c6963a]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#dba0b4] uppercase">
          Purdie&apos;s — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#2e1620] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c6963a] px-3 py-2 text-sm text-[#1c0f14]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#3a1e2a] px-3 py-2 text-sm whitespace-pre-line text-[#faf3ea]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#3a1e2a] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#dba0b4] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#dba0b4] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#dba0b4]" />
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
                className="rounded-full border border-[#4a2a38] px-3 py-1.5 text-xs text-[#dba0b4] transition-colors hover:border-[#c6963a] hover:text-[#faf3ea]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#4a2a38] bg-[#1c0f14] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#4a2a38] bg-[#2e1620] px-3 text-sm text-[#faf3ea] outline-none placeholder:text-[#8a5b6c] focus-visible:border-[#c6963a]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c6963a] text-[#1c0f14] transition-colors hover:bg-[#e0bb6c] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function PurdiesHairAndBeautyConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#faf3ea] text-[#3a2230]`}
      style={{ fontFamily: "var(--font-purdies-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#f3e2e8] px-4 py-1.5 text-center text-[11px] text-[#8a5b6c]">
        <span>
          Concept by <span className="text-[#3a2230]">Hamish AI</span> for{" "}
          <span className="text-[#3a2230]">Purdie&apos;s Hair and Beauty</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#3a2230] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero — dark override, matching every other concept page's photo hero regardless of the page's own light body colour */}
      <section className="relative isolate overflow-hidden bg-[#1c0f14] text-[#faf3ea]">
        <Image
          src="/images/concepts/purdies-hair-and-beauty/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c0f14] via-[#1c0f14]/90 to-[#1c0f14]/55" />
        <BubblesMotif className="pointer-events-none absolute top-1/2 right-[-6%] size-[620px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#c6963a] text-lg font-bold text-[#1c0f14]"
                style={{ fontFamily: "var(--font-purdies-display)" }}
                aria-hidden
              >
                P
              </span>
              <span
                className="text-2xl font-semibold tracking-tight text-[#faf3ea]"
                style={{ fontFamily: "var(--font-purdies-display)" }}
              >
                Purdie&apos;s
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#e0bb6c] uppercase">
              Woodside Way · Glenrothes
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.1] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-purdies-display)" }}
            >
              A 4.9-star salon
              <br />
              <span className="text-[#e0bb6c]">that trains the next one too.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#dba0b4]">
              Hair, nails, lashes, brows and tan on Woodside Way — plus a licensed bar, and an in-house
              training academy behind the chair.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#faf3ea]/80 hover:text-[#faf3ea]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#4a2a38]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-purdies-display)" }}>
                <AnimatedNumber value={4.9} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#dba0b4] uppercase">Rating, 100+ Google reviews</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-purdies-display)" }}>
                2.6K+
              </p>
              <p className="mt-1 text-[11px] text-[#dba0b4] uppercase">Facebook followers</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-purdies-display)" }}>
                Tue–Sat
              </p>
              <p className="mt-1 text-[11px] text-[#dba0b4] uppercase">Days open</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Treatments */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c6963a] uppercase">On the books</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "var(--font-purdies-display)" }}>
            Everything one chair on Woodside Way covers.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#e6d0d8] bg-[#f8ece f0]">
            {TREATMENTS.map((t, i) => (
              <div
                key={t.name}
                className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${i > 0 ? "border-t border-[#e6d0d8]" : ""} bg-[#f8ece5]`}
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-[#8a5b6c]">{t.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#a87a8c]">
            Treatment names as listed via L&apos;Oréal Professionnel&apos;s salon finder and Purdie&apos;s own
            social channels — exact prices aren&apos;t published online, so ask when you call.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#e6d0d8] bg-[#f8ece5] px-3 py-1.5 text-xs text-[#8a5b6c]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment — real, attributed review from Google */}
      <section className="relative overflow-hidden bg-[#c6963a] px-6 py-24 text-[#1c0f14]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-purdies-display)" }}
          >
            &ldquo;Absolutely gorgeous salon and the staff are so welcoming and friendly.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Google review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#2e1620] px-6 py-24 text-[#faf3ea]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e0bb6c] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-purdies-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c6963a] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e6d0d8] bg-[#f8ece5] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-purdies-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#8a5b6c]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#a87a8c]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — most-booked treatments, rebooking rate, quiet appointment slots —
            illustrative, not Purdie&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#e6d0d8] bg-[#faf3ea] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-purdies-display)" }}
          >
            A 4.9-star salon deserves a front door people can actually click through to.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#c6963a] underline underline-offset-4 hover:text-[#a8781f]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#f3e2e8] px-6 pb-10 pt-8 text-center text-[11px] text-[#a87a8c]">
        Purdie&apos;s Hair and Beauty · 54-56 Woodside Way, Glenrothes, KY7 5DF
        <br />
        Built from publicly available information only — not affiliated with or published by Purdie&apos;s Hair
        and Beauty.
      </footer>
    </div>
  );
}
