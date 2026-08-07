"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Teko, Public_Sans } from "next/font/google";
import { Send, Dumbbell, Users, Flame, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Teko is a tall, condensed
// display face — stencilled-on-a-gym-wall energy without copying G1's
// Oswald; Public Sans carries the body plainly.
const display = Teko({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-lw-display",
});
const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-lw-body",
});

const SERVICES = [
  { icon: Dumbbell, title: "Personal training", body: "1-2-1 coaching, tailored programmes" },
  { icon: Users, title: "Group training & classes", body: "High-intensity outdoor and studio sessions" },
  { icon: Flame, title: "Boxing & kettlebells", body: "Strength & conditioning, functional fitness" },
];

const CHIPS = [
  { stat: "0", label: "pages of their own website resolving right now" },
  { stat: "1", label: "of the most Youth Strength & Conditioning coaches in Scotland, by their own count" },
  { stat: "24/7", label: "an assistant could be answering class questions, domain down or not" },
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

// An angular ridge line — territory markers on a topographic map, not a
// literal wolf. A slow light-catch sweeps across the peaks left to right.
function RidgeMotif({ className }: { className?: string }) {
  const peaks = [
    "M0 260 L60 180 L120 240 L190 120 L260 220 L330 150 L400 230 L470 160 L540 240 L600 190",
    "M0 310 L70 250 L140 300 L210 210 L280 290 L350 230 L420 300 L490 240 L560 300 L600 270",
  ];
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden fill="none">
      {peaks.map((d, i) => (
        <path
          key={d}
          d={d}
          stroke="#7ba7bd"
          strokeWidth="1.5"
          className="motif-anim [animation:motif-cascade_5s_ease-in-out_infinite]"
          style={
            {
              "--motif-opacity-min": 0.08,
              "--motif-opacity-max": 0.4 - i * 0.08,
              animationDelay: `${i * 900}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hey, I'm Lone Wolf's AI assistant. Ask me anything.";
const SUGGESTED = ["What training do you offer?", "Do you coach kids?", "How do I get started?"];

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
      const res = await fetch("/api/concepts/lone-wolf-training/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2a333b] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2a333b] bg-[#0b0e11] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#7ba7bd]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#8b98a3] uppercase">
          Lone Wolf — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#0f1317] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#7ba7bd] px-3 py-2 text-sm text-[#0f1317]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#1a2129] px-3 py-2 text-sm whitespace-pre-line text-[#e8ecef]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#1a2129] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#8b98a3] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8b98a3] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8b98a3]" />
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
                className="rounded-full border border-[#2a333b] px-3 py-1.5 text-xs text-[#8b98a3] transition-colors hover:border-[#7ba7bd] hover:text-[#e8ecef]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2a333b] bg-[#0b0e11] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2a333b] bg-[#0f1317] px-3 text-sm text-[#e8ecef] outline-none placeholder:text-[#576068] focus-visible:border-[#7ba7bd]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#7ba7bd] text-[#0f1317] transition-colors hover:bg-[#93bacd] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function LoneWolfTrainingConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#0f1317] text-[#e8ecef]`}
      style={{ fontFamily: "var(--font-lw-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#0b0e11] px-4 py-1.5 text-center text-[11px] text-[#8b98a3]">
        <span>
          Concept by <span className="text-[#e8ecef]">Hamish AI</span> for{" "}
          <span className="text-[#e8ecef]">Lone Wolf High Performance Training</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#e8ecef] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#0f1317]">
        <Image
          src="/images/concepts/lone-wolf-training/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1317] via-[#0f1317]/90 to-[#0f1317]/60" />
        <RidgeMotif className="pointer-events-none absolute inset-x-0 bottom-0 h-[280px] w-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-24 md:pt-20 md:pb-32">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border-2 border-[#7ba7bd] text-lg font-semibold text-[#7ba7bd]"
                style={{ fontFamily: "var(--font-lw-display)" }}
                aria-hidden
              >
                LW
              </span>
              <span
                className="text-2xl font-semibold tracking-wide text-[#e8ecef] uppercase"
                style={{ fontFamily: "var(--font-lw-display)" }}
              >
                Lone Wolf
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#7ba7bd] uppercase">
              Castings Court · Falkirk
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-5xl leading-[0.95] font-semibold text-balance uppercase md:text-7xl"
              style={{ fontFamily: "var(--font-lw-display)" }}
            >
              High performance training.
              <br />
              <span className="text-[#7ba7bd]">Zero website to show for it.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#8b98a3]">
              Real community, real coaching — the site just isn&apos;t loading for anyone right now.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#e8ecef]/80 hover:text-[#e8ecef]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#7ba7bd] uppercase">What we offer</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#2a333b] bg-[#2a333b] sm:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="group flex h-full flex-col gap-3 bg-[#0f1317] p-7 transition-colors duration-300 hover:bg-[#1a2129]">
                <s.icon className="size-5 shrink-0 text-[#7ba7bd]" />
                <div>
                  <p className="text-xl font-semibold uppercase" style={{ fontFamily: "var(--font-lw-display)" }}>
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#8b98a3]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonial moment — real, unattributed member feedback */}
      <section className="relative overflow-hidden bg-[#7ba7bd] px-6 py-24 text-[#0f1317]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance uppercase md:text-5xl"
            style={{ fontFamily: "var(--font-lw-display)" }}
          >
            &ldquo;A real equipped gym with a real community feel.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Member review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#0b0e11] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#7ba7bd] uppercase">Live demo</p>
            <h2
              className="mt-3 text-3xl font-semibold uppercase md:text-4xl"
              style={{ fontFamily: "var(--font-lw-display)" }}
            >
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#7ba7bd] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2a333b] bg-[#1a2129] p-6">
                <p className="text-3xl font-semibold uppercase" style={{ fontFamily: "var(--font-lw-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#8b98a3]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#576068]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — class sign-ups, most-booked sessions, enquiry response time —
            illustrative, not Lone Wolf&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2a333b] bg-[#0f1317] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance uppercase md:text-3xl"
            style={{ fontFamily: "var(--font-lw-display)" }}
          >
            The training is real. The front door should be too.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#7ba7bd] underline underline-offset-4 hover:text-[#93bacd]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#0b0e11] px-6 pb-10 pt-8 text-center text-[11px] text-[#576068]">
        Lone Wolf High Performance Training · Unit 6, Middlefield Industrial Estate, 4 Castings Court, Falkirk,
        FK2 9HQ
        <br />
        Built from publicly available information only — not affiliated with or published by Lone Wolf High
        Performance Training.
      </footer>
    </div>
  );
}
