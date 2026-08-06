"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Barlow } from "next/font/google";
import { Send, Scale, Landmark, FileText, ArrowDown, ShieldCheck, BadgeCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Playfair Display is a
// classic, columned display serif — the kind cut into a solicitor's
// stone lintel; Barlow carries the body plainly and legibly.
const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bm-display",
});
const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-bm-body",
});

const SERVICES = [
  { icon: Scale, title: "Litigation", body: "Family law, employment law, debt collection, court agency" },
  { icon: Landmark, title: "Property", body: "Residential conveyancing, commercial property and leasing" },
  { icon: FileText, title: "Wills & Power of Attorney", body: "Wills, executries, and powers of attorney" },
];

const CHIPS = [
  { stat: "1905", label: "the year the firm was founded, at Grahamston Station, Falkirk" },
  { stat: "0", label: "online enquiry forms on the current site — phone, email, or in person only" },
  { stat: "24/7", label: "an assistant could be answering routine questions, out of hours or not" },
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

// A fluted-pillar motif — the columned front of a solicitor's office,
// rendered as plain vertical rules rather than any literal building. A
// slow glow crosses the row left to right, like low sun catching each
// column in turn.
function PillarMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => {
        const peak = 0.5 - (i % 4) * 0.05;
        return (
          <rect
            key={i}
            x={20 + i * 64}
            y="40"
            width="20"
            height="520"
            fill="none"
            stroke="#7a2e2e"
            strokeWidth="2"
            className="motif-anim [animation:motif-cascade_2.8s_ease-in-out_infinite]"
            style={
              {
                "--motif-opacity-min": 0.05,
                "--motif-opacity-max": peak,
                animationDelay: `${i * 180}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello, I'm Blackadder & McMonagle's AI assistant. Ask me anything.";
const SUGGESTED = ["What areas do you cover?", "How long have you been trading?", "How do I get in touch?"];

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
      const res = await fetch("/api/concepts/blackadder-mcmonagle/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#d9cdb8] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#d9cdb8] bg-[#ece1cc] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#7a2e2e]/50" />
        <span className="size-2.5 rounded-full bg-emerald-600/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#5b5140] uppercase">
          Blackadder &amp; McMonagle — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#f9f5eb] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#7a2e2e] px-3 py-2 text-sm text-[#f9f5eb]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#eee4d1] px-3 py-2 text-sm whitespace-pre-line text-[#1f2a24]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#eee4d1] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#8a7355] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8a7355] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#8a7355]" />
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
                className="rounded-full border border-[#d9cdb8] px-3 py-1.5 text-xs text-[#5b5140] transition-colors hover:border-[#7a2e2e] hover:text-[#1f2a24]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#d9cdb8] bg-[#ece1cc] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#d9cdb8] bg-[#f9f5eb] px-3 text-sm text-[#1f2a24] outline-none placeholder:text-[#a89a80] focus-visible:border-[#7a2e2e]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#7a2e2e] text-[#f9f5eb] transition-colors hover:bg-[#8f3b3b] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function BlackadderMcMonagleConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#f5f1e8] text-[#1f2a24]`}
      style={{ fontFamily: "var(--font-bm-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#ece1cc] px-4 py-1.5 text-center text-[11px] text-[#5b5140]">
        <span>
          Concept by <span className="text-[#1f2a24]">Hamish AI</span> for{" "}
          <span className="text-[#1f2a24]">Blackadder &amp; McMonagle</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#1f2a24] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#f5f1e8]">
        <PillarMotif className="pointer-events-none absolute top-0 right-[-6%] h-full w-[600px] opacity-60" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border-2 border-[#7a2e2e] text-base font-semibold text-[#7a2e2e]"
                style={{ fontFamily: "var(--font-bm-display)" }}
                aria-hidden
              >
                B&amp;M
              </span>
              <span
                className="text-xl font-semibold tracking-wide text-[#1f2a24] uppercase"
                style={{ fontFamily: "var(--font-bm-display)" }}
              >
                Blackadder &amp; McMonagle
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#7a2e2e] uppercase">
              High Street · Falkirk
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-bm-display)" }}
            >
              Over a century of practice.
              <br />
              <span className="text-[#7a2e2e]">Not one enquiry form.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#5b5140]">
              Founded 1905 at Grahamston Station, Falkirk — still practising, still phone-and-email only.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#1f2a24]/80 hover:text-[#1f2a24]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#d9cdb8]">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-bm-display)" }}>
                1905
              </p>
              <p className="mt-1 text-[11px] text-[#5b5140] uppercase">Founded</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-bm-display)" }}>
                <AnimatedNumber value={120} suffix="+" />
              </p>
              <p className="mt-1 text-[11px] text-[#5b5140] uppercase">Years practising</p>
            </Reveal>
            <Reveal delay={160}>
              <p
                className="flex items-center gap-1.5 text-2xl font-semibold"
                style={{ fontFamily: "var(--font-bm-display)" }}
              >
                <BadgeCheck className="size-5 text-[#7a2e2e]" />
                Falkirk
              </p>
              <p className="mt-1 text-[11px] text-[#5b5140] uppercase">Sheriff Court agency</p>
            </Reveal>
            <Reveal delay={240}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-bm-display)" }}>
                3 areas
              </p>
              <p className="mt-1 text-[11px] text-[#5b5140] uppercase">Litigation, property, wills</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#7a2e2e] uppercase">What we handle</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#d9cdb8] bg-[#d9cdb8] sm:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="group flex h-full flex-col gap-3 bg-[#f5f1e8] p-7 transition-colors duration-300 hover:bg-[#ece1cc]">
                <s.icon className="size-5 shrink-0 text-[#7a2e2e]" />
                <div>
                  <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-bm-display)" }}>
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#5b5140]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#ece1cc] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#7a2e2e] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-bm-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#7a2e2e] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#d9cdb8] bg-[#f9f5eb] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-bm-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#5b5140]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#a89a80]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — enquiry volume by matter type, response time saved, deadline reminders
            sent — illustrative, not the firm&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#d9cdb8] bg-[#f5f1e8] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-bm-display)" }}
          >
            A hundred and twenty years of trust deserves a website that answers back.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#7a2e2e] underline underline-offset-4 hover:text-[#8f3b3b]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#ece1cc] px-6 pb-10 pt-8 text-center text-[11px] text-[#a89a80]">
        Blackadder &amp; McMonagle · 41 High Street, Falkirk, FK1 1EN
        <br />
        Built from publicly available information only — not affiliated with or published by Blackadder &amp;
        McMonagle.
      </footer>
    </div>
  );
}
