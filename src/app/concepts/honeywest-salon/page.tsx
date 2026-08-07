"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Marcellus, Nunito_Sans } from "next/font/google";
import { Send, Scissors, Sparkles, Star, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Marcellus is a quiet,
// elegant serif — a salon mirror, not a barbershop sign; Nunito Sans
// carries the body softly.
const display = Marcellus({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hn-display",
});
const body = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hn-body",
});

const SERVICES = [
  { icon: Scissors, title: "Hair", body: "Cuts, colour, highlights, styling, blow-dry" },
  { icon: Sparkles, title: "Nails & beauty", body: "Gel and acrylic nails, waxing, threading, tanning" },
  { icon: Star, title: "Face & lash", body: "Facials, dermaplaning, lash lifts, tinting, makeup" },
];

const CHIPS = [
  { stat: "5.0", label: "average rating across 36 reviews on Treatwell" },
  { stat: "2017", label: "the year Honeywest first opened in Pumpherston" },
  { stat: "24/7", label: "an assistant could be answering booking questions, no site or not" },
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

// Flowing curved strands — a soft, brushed-through-hair line motif, not a
// literal photo of any specific style.
function StrandMotif({ className }: { className?: string }) {
  const strands = [
    { d: "M420 0 C360 120 480 220 400 340 C330 440 440 520 380 600", delay: 0 },
    { d: "M470 0 C410 130 530 230 450 350 C380 450 490 530 430 600", delay: 0.6 },
    { d: "M370 0 C310 110 430 210 350 330 C280 430 390 510 330 600", delay: 1.2 },
  ];
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      {strands.map((s, i) => (
        <path
          key={s.d}
          d={s.d}
          stroke="#c98fa0"
          strokeWidth="1.5"
          className="motif-anim [animation:motif-drift_18s_ease-in-out_infinite]"
          style={{ "--motif-opacity-min": 0.1, animationDelay: `${s.delay}s`, opacity: 0.24 - i * 0.04 } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Honeywest's AI assistant. Ask me anything.";
const SUGGESTED = ["What treatments do you offer?", "How do I book?", "Do you do lash lifts?"];

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
      const res = await fetch("/api/concepts/honeywest-salon/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#3d2a35] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#3d2a35] bg-[#170e14] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c98fa0]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#b696a1] uppercase">
          Honeywest — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#1e131b] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c98fa0] px-3 py-2 text-sm text-[#1e131b]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#2c1c26] px-3 py-2 text-sm whitespace-pre-line text-[#f3e9ee]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#2c1c26] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#b696a1] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#b696a1] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#b696a1]" />
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
                className="rounded-full border border-[#3d2a35] px-3 py-1.5 text-xs text-[#b696a1] transition-colors hover:border-[#c98fa0] hover:text-[#f3e9ee]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#3d2a35] bg-[#170e14] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#3d2a35] bg-[#1e131b] px-3 text-sm text-[#f3e9ee] outline-none placeholder:text-[#6e4f5c] focus-visible:border-[#c98fa0]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c98fa0] text-[#1e131b] transition-colors hover:bg-[#d7a5b3] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function HoneywestSalonConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#1e131b] text-[#f3e9ee]`}
      style={{ fontFamily: "var(--font-hn-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#170e14] px-4 py-1.5 text-center text-[11px] text-[#b696a1]">
        <span>
          Concept by <span className="text-[#f3e9ee]">Hamish AI</span> for{" "}
          <span className="text-[#f3e9ee]">Honeywest Hair &amp; Beauty Salon</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f3e9ee] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#1e131b]">
        <Image
          src="/images/concepts/honeywest-salon/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e131b] via-[#1e131b]/92 to-[#1e131b]/60" />
        <StrandMotif className="pointer-events-none absolute top-1/2 right-[-4%] size-[560px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border border-[#c98fa0] text-lg text-[#c98fa0]"
                style={{ fontFamily: "var(--font-hn-display)" }}
                aria-hidden
              >
                H
              </span>
              <span
                className="text-xl tracking-wide text-[#f3e9ee] uppercase"
                style={{ fontFamily: "var(--font-hn-display)" }}
              >
                Honeywest
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#c98fa0] uppercase">
              Pumpherston · Livingston
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.1] font-normal text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-hn-display)" }}
            >
              A perfect five stars,
              <br />
              <span className="text-[#c98fa0] italic">nowhere to be found online.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#b696a1]">
              Hair, nails, and beauty in Pumpherston since 2017 — booked entirely through a third-party
              marketplace.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f3e9ee]/80 hover:text-[#f3e9ee]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#3d2a35]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-hn-display)" }}>
                <AnimatedNumber value={5} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#b696a1] uppercase">Average rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-hn-display)" }}>
                <AnimatedNumber value={36} />
              </p>
              <p className="mt-1 text-[11px] text-[#b696a1] uppercase">Verified reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-hn-display)" }}>
                2017
              </p>
              <p className="mt-1 text-[11px] text-[#b696a1] uppercase">Established</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c98fa0] uppercase">Treatments</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#3d2a35] bg-[#3d2a35] sm:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="group flex h-full flex-col gap-3 bg-[#1e131b] p-7 transition-colors duration-300 hover:bg-[#2c1c26]">
                <s.icon className="size-5 shrink-0 text-[#c98fa0]" />
                <div>
                  <p className="text-lg font-normal" style={{ fontFamily: "var(--font-hn-display)" }}>
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#b696a1]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonial moment — real, attributed reviews from Treatwell */}
      <section className="relative overflow-hidden bg-[#c98fa0] px-6 py-24 text-[#1e131b]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-normal text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-hn-display)" }}
          >
            &ldquo;She was friendly and made me feel very welcome.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Eileen, on her restyle with Sakita
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#170e14] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c98fa0] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-normal md:text-4xl" style={{ fontFamily: "var(--font-hn-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c98fa0] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#3d2a35] bg-[#2c1c26] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-hn-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#b696a1]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#6e4f5c]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — most-booked treatments, rebooking rate, quiet appointment slots —
            illustrative, not Honeywest&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#3d2a35] bg-[#1e131b] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-normal text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-hn-display)" }}
          >
            Five stars deserves a front door of its own, not just a marketplace listing.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#c98fa0] underline underline-offset-4 hover:text-[#d7a5b3]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#170e14] px-6 pb-10 pt-8 text-center text-[11px] text-[#6e4f5c]">
        Honeywest Hair &amp; Beauty Salon · Pumpherston, Livingston, West Lothian
        <br />
        Built from publicly available information only — not affiliated with or published by Honeywest Hair &amp;
        Beauty Salon.
      </footer>
    </div>
  );
}
