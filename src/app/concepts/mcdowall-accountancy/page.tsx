"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Newsreader, Archivo } from "next/font/google";
import {
  Send,
  Calculator,
  Receipt,
  Users,
  TrendingUp,
  ArrowDown,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only — not the site's shared
// Fraunces/mono, and not C4 Joinery's Big Shoulders/Work Sans. Newsreader
// reads like a broadsheet financial-page serif (trust, precision,
// tradition); Archivo carries the body and tabular figures plainly.
const display = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-mcd-display",
});
const body = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mcd-body",
});

const SERVICES = [
  { icon: Calculator, title: "Accountancy", body: "Annual accounts, statutory filing, bookkeeping" },
  { icon: Receipt, title: "Taxation", body: "Self-assessment, corporation tax, VAT returns" },
  { icon: Users, title: "Payroll", body: "PAYE, pensions auto-enrolment, payslips" },
  { icon: TrendingUp, title: "Business advisory", body: "Planning, forecasting, start-up advice" },
];

const CHIPS = [
  { stat: "0", label: "pages of their own website beyond a coming-soon stub" },
  { stat: "16", label: "years trading as an ICAS-regulated practice" },
  { stat: "24/7", label: "an assistant could be answering client questions, page down or not" },
];

// Counts up on mount rather than gating behind an IntersectionObserver —
// confirmed correct in the C4 Joinery build; kept identical here.
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

// A ledger motif — ruled lines fading into the distance, like an open
// account book — kept from the original build (it already fit the
// industry) but recoloured to the new brass/gold accent.
function LedgerMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => {
        const peak = 0.48 - i * 0.025;
        return (
          <line
            key={i}
            x1="0"
            y1={30 + i * 27}
            x2="600"
            y2={30 + i * 27}
            stroke="#b98a3d"
            strokeWidth="1.5"
            className="motif-anim [animation:motif-cascade_3.2s_ease-in-out_infinite]"
            style={
              {
                "--motif-opacity-min": 0.03,
                "--motif-opacity-max": peak,
                animationDelay: `${i * 100}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
      <line x1="470" y1="0" x2="470" y2="400" stroke="#b98a3d" strokeWidth="1" opacity="0.15" />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello, I'm McDowall Accountancy's AI assistant. Ask me anything.";
const SUGGESTED = ["What services do you offer?", "How long have you been trading?", "How do I get in touch?"];

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
      const res = await fetch("/api/concepts/mcdowall-accountancy/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2f4536] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2f4536] bg-[#182319] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#b98a3d]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#9db3a1] uppercase">
          McDowall Accountancy — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#111a15] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#b98a3d] px-3 py-2 text-sm text-[#14201a]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#1c2b22] px-3 py-2 text-sm whitespace-pre-line text-[#eef1ec]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#1c2b22] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db3a1] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db3a1] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db3a1]" />
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
                className="rounded-full border border-[#2f4536] px-3 py-1.5 text-xs text-[#9db3a1] transition-colors hover:border-[#b98a3d] hover:text-[#eef1ec]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2f4536] bg-[#182319] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2f4536] bg-[#111a15] px-3 text-sm text-[#eef1ec] outline-none placeholder:text-[#5f7267] focus-visible:border-[#b98a3d]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#b98a3d] text-[#14201a] transition-colors hover:bg-[#cb9c4e] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function McDowallAccountancyConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#14201a] text-[#eef1ec]`}
      style={{ fontFamily: "var(--font-mcd-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#0e1712] px-4 py-1.5 text-center text-[11px] text-[#9db3a1]">
        <span>
          Concept by <span className="text-[#eef1ec]">Hamish AI</span> for{" "}
          <span className="text-[#eef1ec]">McDowall Accountancy Solutions Ltd</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#eef1ec] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#14201a]">
        <Image
          src="/images/concepts/mcdowall-accountancy/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14201a] via-[#14201a]/92 to-[#14201a]/60" />
        <LedgerMotif className="pointer-events-none absolute top-0 right-[-6%] h-full w-[640px] opacity-70" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border-2 border-[#b98a3d] text-base font-semibold text-[#b98a3d] italic"
                style={{ fontFamily: "var(--font-mcd-display)" }}
                aria-hidden
              >
                Mc
              </span>
              <span
                className="text-xl font-medium tracking-wide text-[#eef1ec] uppercase"
                style={{ fontFamily: "var(--font-mcd-display)" }}
              >
                McDowall Accountancy
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#b98a3d] uppercase">
              Hamilton · South Lanarkshire
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-mcd-display)" }}
            >
              Straightforward advice,
              <br />
              <span className="text-[#b98a3d] italic">sixteen years running.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#9db3a1]">
              Chartered, ICAS-regulated, and trusted in Hamilton since 2010.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#eef1ec]/80 hover:text-[#eef1ec]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        {/* Ledger trust strip */}
        <div className="relative border-t border-[#2f4536]">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-mcd-display)" }}>
                2010
              </p>
              <p className="mt-1 text-[11px] text-[#9db3a1] uppercase">Established</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-mcd-display)" }}>
                <AnimatedNumber value={16} />
              </p>
              <p className="mt-1 text-[11px] text-[#9db3a1] uppercase">Years trading</p>
            </Reveal>
            <Reveal delay={160}>
              <p
                className="flex items-center gap-1.5 text-2xl font-semibold"
                style={{ fontFamily: "var(--font-mcd-display)" }}
              >
                <BadgeCheck className="size-5 text-[#b98a3d]" />
                ICAS
              </p>
              <p className="mt-1 text-[11px] text-[#9db3a1] uppercase">Regulated for audit</p>
            </Reveal>
            <Reveal delay={240}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-mcd-display)" }}>
                Active
              </p>
              <p className="mt-1 text-[11px] text-[#9db3a1] uppercase">Companies House SC371214</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#b98a3d] uppercase">What we handle</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#2f4536] bg-[#2f4536] sm:grid-cols-2">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="group flex h-full items-start gap-4 bg-[#14201a] p-7 transition-colors duration-300 hover:bg-[#1c2b22]">
                <s.icon className="mt-0.5 size-5 shrink-0 text-[#b98a3d]" />
                <div>
                  <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-mcd-display)" }}>
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#9db3a1]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What's live right now — honest, real */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#b98a3d] uppercase">What&apos;s live today</p>
          <div className="mt-6 overflow-hidden rounded-xl border border-[#2f4536] shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-[#2f4536] bg-[#182319] px-3 py-2">
              <span className="size-2.5 rounded-full bg-[#2f4536]" />
              <span className="size-2.5 rounded-full bg-[#2f4536]" />
              <span className="size-2.5 rounded-full bg-[#2f4536]" />
              <span className="ml-2 text-[11px] text-[#9db3a1]">mcdowall-accountancy.co.uk</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-[#111a15] px-6 py-14 text-center">
              <p className="text-xl text-[#9db3a1] italic" style={{ fontFamily: "var(--font-mcd-display)" }}>
                &ldquo;A bright idea, coming soon.&rdquo;
              </p>
              <p className="mt-2 text-xs text-[#5f7267]">— the actual page their domain shows today</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#0e1712] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#b98a3d] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-mcd-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#b98a3d] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2f4536] bg-[#1c2b22] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-mcd-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#9db3a1]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#5f7267]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — client onboarding time, query response rate, tax deadline reminders sent —
            illustrative, not McDowall&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2f4536] bg-[#14201a] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-mcd-display)" }}
          >
            Sixteen years of real work deserves a real website.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#b98a3d] underline underline-offset-4 hover:text-[#cb9c4e]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#0e1712] px-6 pb-10 pt-8 text-center text-[11px] text-[#5f7267]">
        McDowall Accountancy Solutions Ltd · 26 Tiree Grange, Hamilton, South Lanarkshire, ML3 8BP · 01698 424125
        <br />
        Built from publicly available information only — not affiliated with or published by McDowall Accountancy
        Solutions Ltd.
      </footer>
    </div>
  );
}
