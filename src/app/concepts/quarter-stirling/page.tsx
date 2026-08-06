"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only — and a period-accurate one:
// Baskerville was cut in the 1750s, the exact decade this house was
// built, so the display face is a genuine historical reference rather
// than an arbitrary choice. Source Sans 3 carries the body plainly.
const display = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-qs-display",
});
const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-qs-body",
});

const TAGS = ["Georgian country house, built 1753", "60 acres of gardens & parkland", "Whisky by the fire, most evenings", "Dog-friendly"];

const ROOMS = [
  { name: "Two double rooms", body: "En-suite with a bath, fresh flowers and fruit on arrival" },
  { name: "One twin room", body: "En-suite with a shower, ideal for friends travelling together" },
];

const CHIPS = [
  { stat: "0", label: "their domain doesn't resolve at all — a DNS failure, confirmed on retry" },
  { stat: "1753", label: "the year this house was built" },
  { stat: "24/7", label: "an assistant could be answering, whatever the hour" },
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

// A classical pediment silhouette — evokes Georgian architecture, kept
// from the original build since it already fit well. Low light seems to
// cross the columns one at a time; the roofline and pediment hold a
// slower, unified breathing pulse rather than joining the sweep.
function PedimentMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden>
      <g
        stroke="#cf98a6"
        strokeWidth="2"
        fill="none"
        className="motif-anim [animation:motif-cascade_6s_ease-in-out_infinite]"
        style={{ "--motif-opacity-min": 0.1, "--motif-opacity-max": 0.5 } as React.CSSProperties}
      >
        <path d="M150 220 L300 100 L450 220 Z" />
        <line x1="150" y1="220" x2="450" y2="220" />
      </g>
      {[180, 260, 340, 420].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1="220"
          x2={x}
          y2="340"
          stroke="#cf98a6"
          strokeWidth="2"
          className="motif-anim [animation:motif-cascade_2.6s_ease-in-out_infinite]"
          style={
            {
              "--motif-opacity-min": 0.06,
              "--motif-opacity-max": 0.48,
              animationDelay: `${i * 200}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello, I'm Quarter Stirling's AI assistant. Ask me anything.";
const SUGGESTED = ["Tell me about the house", "Is it dog-friendly?", "How do I get in touch?"];

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
      const res = await fetch("/api/concepts/quarter-stirling/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#3c2530] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#3c2530] bg-[#140a0f] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#8a2f3f]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-[#b89aa3] uppercase">
          Quarter Stirling — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#1c1015] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#8a2f3f] px-3 py-2 text-sm text-[#f4ecee]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#2a1a20] px-3 py-2 text-sm whitespace-pre-line text-[#f4ecee]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#2a1a20] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#b89aa3] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#b89aa3] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#b89aa3]" />
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
                className="rounded-full border border-[#3c2530] px-3 py-1.5 text-xs text-[#b89aa3] transition-colors hover:border-[#8a2f3f] hover:text-[#f4ecee]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#3c2530] bg-[#140a0f] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#3c2530] bg-[#1c1015] px-3 text-sm text-[#f4ecee] outline-none placeholder:text-[#725a63] focus-visible:border-[#8a2f3f]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#8a2f3f] text-[#f4ecee] transition-colors hover:bg-[#9c3d4d] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function QuarterStirlingConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#f6f0e2] text-[#1c1015]`}
      style={{ fontFamily: "var(--font-qs-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#140a0f] px-4 py-1.5 text-center text-[11px] text-[#b89aa3]">
        <span>
          Concept by <span className="text-[#f4ecee]">Hamish AI</span> for{" "}
          <span className="text-[#f4ecee]">Quarter Stirling</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f4ecee] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#1c1015] text-[#f4ecee]">
        <Image
          src="/images/concepts/quarter-stirling/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1015] via-[#1c1015]/90 to-[#1c1015]/55" />
        <PedimentMotif className="pointer-events-none absolute top-1/2 right-[-4%] size-[600px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border border-[#cf98a6] text-lg text-[#cf98a6]"
                style={{ fontFamily: "var(--font-qs-display)" }}
                aria-hidden
              >
                QS
              </span>
              <span
                className="text-2xl font-bold tracking-tight text-[#f4ecee]"
                style={{ fontFamily: "var(--font-qs-display)" }}
              >
                Quarter Stirling
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#cf98a6] uppercase">
              Denny · Near Stirling
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-bold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-qs-display)" }}
            >
              Georgian hospitality,
              <br />
              <span className="text-[#cf98a6] italic">welcoming guests since 1753.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#b89aa3]">
              Sixty acres of gardens, whisky by the fire, and hosts who make you feel completely at home.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f4ecee]/80 hover:text-[#f4ecee]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#3c2530]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-qs-display)" }}>
                1753
              </p>
              <p className="mt-1 text-[11px] text-[#b89aa3] uppercase">Built</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "var(--font-qs-display)" }}>
                <AnimatedNumber value={60} />
              </p>
              <p className="mt-1 text-[11px] text-[#b89aa3] uppercase">Acres of grounds</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "var(--font-qs-display)" }}>
                <AnimatedNumber value={3} />
              </p>
              <p className="mt-1 text-[11px] text-[#b89aa3] uppercase">En-suite rooms</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Where to stay */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8a2f3f] uppercase">Where to stay</p>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl" style={{ fontFamily: "var(--font-qs-display)" }}>
            Three rooms, one gracious house.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#e6d9c2] bg-white">
            {ROOMS.map((r, i) => (
              <div key={r.name} className={`px-6 py-4 ${i > 0 ? "border-t border-[#e6d9c2]" : ""}`}>
                <p className="font-semibold">{r.name}</p>
                <p className="mt-0.5 text-sm text-[#7a636a]">{r.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#7a636a]">
            Breakfast included, minimum two-night stay — ten minutes from Stirling itself.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#e6d9c2] bg-white px-3 py-1.5 text-xs text-[#5c4a51]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#8a2f3f] px-6 py-24 text-[#f6f0e2]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-bold text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-qs-display)" }}
          >
            &ldquo;Pippa is ever accommodating and looks after your every need.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Tripadvisor review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#140a0f] px-6 py-24 text-[#f4ecee]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#cf98a6] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--font-qs-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8a2f3f] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e6d9c2] bg-white p-6">
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-qs-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#5c4a51]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#7a636a]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — enquiry response time, seasonal booking demand, repeat-guest rate —
            illustrative, not Quarter Stirling&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#3c2530] bg-[#1c1015] px-6 py-24 text-center text-[#f4ecee]">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-bold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-qs-display)" }}
          >
            A house this gracious deserves to be found.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#cf98a6] underline underline-offset-4 hover:text-[#dcaeb9]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#140a0f] px-6 pb-10 pt-8 text-center text-[11px] text-[#7a636a]">
        Quarter Stirling · Denny, near Stirling, Scotland · quarterstirling@hotmail.co.uk
        <br />
        Built from publicly available information only — not affiliated with or published by Quarter Stirling.
      </footer>
    </div>
  );
}
