"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Oswald, Rubik } from "next/font/google";
import { Send, Dumbbell, Users, Flame, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Oswald is a bold, condensed
// display face — the kind you'd see stencilled on a gym wall; Rubik
// carries the body with a bit more energy than a neutral sans.
const display = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-g1-display",
});
const body = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-g1-body",
});

const SERVICES = [
  { icon: Dumbbell, title: "1-2-1 personal training", body: "Private gym access, free parking, tailored plans" },
  { icon: Users, title: "Group training", body: "Small-group sessions and boxing coaching" },
  { icon: Flame, title: "Online coaching", body: "Remote fitness and nutrition coaching" },
];

const CHIPS = [
  { stat: "2022", label: "the copyright year still showing in the footer" },
  { stat: "0", label: "online booking on the site — phone or contact form only" },
  { stat: "24/7", label: "an assistant could be booking sessions in, page fixed or not" },
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

// Diagonal speed-lines — motion and effort, not a literal photo of any
// specific person or gym floor.
function SpeedLinesMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={i}
          x1={-100 + i * 70}
          y1="0"
          x2={100 + i * 70}
          y2="600"
          stroke="#ff5a36"
          strokeWidth="3"
          opacity={0.12 - (i % 4) * 0.015}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hey, I'm G1 Personal Training's AI assistant. Ask me anything.";
const SUGGESTED = ["Do you train Southside clients?", "What's included in 1-2-1 training?", "How do I book a session?"];

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
      const res = await fetch("/api/concepts/g1-personal-training/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2a2a2a] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2a2a2a] bg-[#050505] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#ff5a36]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#9a9a97] uppercase">
          G1 Personal Training — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#0b0b0d] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#ff5a36] px-3 py-2 text-sm text-[#0b0b0d]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#1a1a1c] px-3 py-2 text-sm whitespace-pre-line text-[#f2f1ee]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#1a1a1c] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9a9a97] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9a9a97] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9a9a97]" />
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
                className="rounded-full border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#9a9a97] transition-colors hover:border-[#ff5a36] hover:text-[#f2f1ee]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2a2a2a] bg-[#050505] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2a2a2a] bg-[#0b0b0d] px-3 text-sm text-[#f2f1ee] outline-none placeholder:text-[#5c5c58] focus-visible:border-[#ff5a36]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#ff5a36] text-[#0b0b0d] transition-colors hover:bg-[#ff7654] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function G1PersonalTrainingConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#0b0b0d] text-[#f2f1ee]`}
      style={{ fontFamily: "var(--font-g1-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#050505] px-4 py-1.5 text-center text-[11px] text-[#9a9a97]">
        <span>
          Concept by <span className="text-[#f2f1ee]">Hamish AI</span> for{" "}
          <span className="text-[#f2f1ee]">G1 Personal Training</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f2f1ee] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#0b0b0d]">
        <SpeedLinesMotif className="pointer-events-none absolute inset-0 size-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center bg-[#ff5a36] text-lg font-bold text-[#0b0b0d]"
                style={{ fontFamily: "var(--font-g1-display)" }}
                aria-hidden
              >
                G1
              </span>
              <span
                className="text-xl font-semibold tracking-wide text-[#f2f1ee] uppercase"
                style={{ fontFamily: "var(--font-g1-display)" }}
              >
                G1 Personal Training
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#ff5a36] uppercase">
              Private studio · Glasgow, serving the Southside
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.05] font-semibold text-balance uppercase md:text-6xl"
              style={{ fontFamily: "var(--font-g1-display)" }}
            >
              26 years coaching.
              <br />
              <span className="text-[#ff5a36]">One page still under construction.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#9a9a97]">
              Gareth&apos;s been coaching Southside clients to real results since 2010 — the site just hasn&apos;t
              kept up.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f2f1ee]/80 hover:text-[#f2f1ee]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#2a2a2a]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p
                className="text-2xl font-semibold tabular-nums uppercase"
                style={{ fontFamily: "var(--font-g1-display)" }}
              >
                <AnimatedNumber value={2010} />
              </p>
              <p className="mt-1 text-[11px] text-[#9a9a97] uppercase">Founded by Gareth</p>
            </Reveal>
            <Reveal delay={80}>
              <p
                className="text-2xl font-semibold tabular-nums uppercase"
                style={{ fontFamily: "var(--font-g1-display)" }}
              >
                <AnimatedNumber value={26} suffix="+" />
              </p>
              <p className="mt-1 text-[11px] text-[#9a9a97] uppercase">Years coaching experience</p>
            </Reveal>
            <Reveal delay={160}>
              <p
                className="text-2xl font-semibold uppercase"
                style={{ fontFamily: "var(--font-g1-display)" }}
              >
                Free parking
              </p>
              <p className="mt-1 text-[11px] text-[#9a9a97] uppercase">Private gym, 15-20 min from Southside</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#ff5a36] uppercase">What we offer</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#2a2a2a] sm:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="group flex h-full flex-col gap-3 bg-[#0b0b0d] p-7 transition-colors duration-300 hover:bg-[#1a1a1c]">
                <s.icon className="size-5 shrink-0 text-[#ff5a36]" />
                <div>
                  <p
                    className="text-lg font-semibold uppercase"
                    style={{ fontFamily: "var(--font-g1-display)" }}
                  >
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#9a9a97]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonial moment — a real, named result from their own site */}
      <section className="relative overflow-hidden bg-[#ff5a36] px-6 py-24 text-[#0b0b0d]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-semibold text-balance uppercase md:text-5xl"
            style={{ fontFamily: "var(--font-g1-display)" }}
          >
            &ldquo;5 stone lost, through boxing training.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Kylie, Glasgow Southside — client result on their own site
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#050505] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#ff5a36] uppercase">Live demo</p>
            <h2
              className="mt-3 text-3xl font-semibold uppercase md:text-4xl"
              style={{ fontFamily: "var(--font-g1-display)" }}
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#ff5a36] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1c] p-6">
                <p
                  className="text-3xl font-semibold uppercase"
                  style={{ fontFamily: "var(--font-g1-display)" }}
                >
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#9a9a97]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#5c5c58]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — sessions booked per week, no-show rate, most-requested time slots —
            illustrative, not G1&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2a2a2a] bg-[#0b0b0d] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance uppercase md:text-3xl"
            style={{ fontFamily: "var(--font-g1-display)" }}
          >
            Real results deserve a site that actually books them in.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#ff5a36] underline underline-offset-4 hover:text-[#ff7654]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#050505] px-6 pb-10 pt-8 text-center text-[11px] text-[#5c5c58]">
        G1 Personal Training · 137B Dalsetter Avenue, Glasgow, G15 8TE
        <br />
        Built from publicly available information only — not affiliated with or published by G1 Personal Training.
      </footer>
    </div>
  );
}
