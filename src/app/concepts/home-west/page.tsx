"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Domine, Inter } from "next/font/google";
import { Send, Home, Camera, ClipboardList, Key, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Domine is a sturdy,
// trustworthy serif — the kind you'd see on a solicitor's letterhead or
// a property brochure; Inter carries the body plainly and legibly.
const display = Domine({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-hw-display",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hw-body",
});

const SERVICES = [
  { icon: Home, title: "Residential sales", body: "Valuations, marketing, and sale progression" },
  { icon: Key, title: "Lettings & management", body: "Tenant referencing, rent collection, maintenance" },
  { icon: Camera, title: "Photography & floorplans", body: "Professional photos, virtual tours, floorplans" },
  { icon: ClipboardList, title: "Deposit protection", body: "Rent guarantee and Safe Deposit Scotland" },
];

const CHIPS = [
  { stat: "0", label: "online enquiry or valuation forms on the site today" },
  { stat: "30+", label: "years of Glasgow property experience" },
  { stat: "24/7", label: "an assistant could be triaging enquiries, out of hours or not" },
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

// An abstract terraced-window grid — Glasgow West End sandstone tenement
// windows rendered as a line motif, not a literal photo of any specific
// building. Each window twinkles on its own cycle, like lights coming on
// across a tenement at dusk.
function WindowGridMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => {
          const peak = 0.55 - (row + col) * 0.035;
          return (
            <rect
              key={`${row}-${col}`}
              x={40 + col * 130}
              y={40 + row * 110}
              width="90"
              height="70"
              fill="none"
              stroke="#c9a15a"
              strokeWidth="2"
              className="motif-anim [animation:motif-cascade_3.5s_ease-in-out_infinite]"
              style={
                {
                  "--motif-opacity-min": 0.04,
                  "--motif-opacity-max": peak,
                  animationDelay: `${(row * 4 + col) * 180}ms`,
                } as React.CSSProperties
              }
            />
          );
        }),
      )}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello, I'm Home West's AI assistant. Ask me anything.";
const SUGGESTED = ["Do you cover the West End?", "How does letting work?", "How do I get a valuation?"];

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
      const res = await fetch("/api/concepts/home-west/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2a3442] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2a3442] bg-[#0c1017] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c9a15a]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#93a1b2] uppercase">
          Home West — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#0e131b] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c9a15a] px-3 py-2 text-sm text-[#10151c]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#182230] px-3 py-2 text-sm whitespace-pre-line text-[#ece7db]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#182230] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#93a1b2] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#93a1b2] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#93a1b2]" />
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
                className="rounded-full border border-[#2a3442] px-3 py-1.5 text-xs text-[#93a1b2] transition-colors hover:border-[#c9a15a] hover:text-[#ece7db]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2a3442] bg-[#0c1017] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2a3442] bg-[#0e131b] px-3 text-sm text-[#ece7db] outline-none placeholder:text-[#576374] focus-visible:border-[#c9a15a]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c9a15a] text-[#10151c] transition-colors hover:bg-[#d9b578] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function HomeWestConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#10151c] text-[#ece7db]`}
      style={{ fontFamily: "var(--font-hw-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#0c1017] px-4 py-1.5 text-center text-[11px] text-[#93a1b2]">
        <span>
          Concept by <span className="text-[#ece7db]">Hamish AI</span> for{" "}
          <span className="text-[#ece7db]">Home West</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#ece7db] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#10151c]">
        <WindowGridMotif className="pointer-events-none absolute top-1/2 right-[-8%] size-[640px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border-2 border-[#c9a15a] text-base font-semibold text-[#c9a15a]"
                style={{ fontFamily: "var(--font-hw-display)" }}
                aria-hidden
              >
                HW
              </span>
              <span
                className="text-xl font-semibold tracking-wide text-[#ece7db] uppercase"
                style={{ fontFamily: "var(--font-hw-display)" }}
              >
                Home West
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#c9a15a] uppercase">
              Woodside Place · Glasgow West End
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-hw-display)" }}
            >
              Thirty years of Glasgow property,
              <br />
              <span className="text-[#c9a15a]">one person you actually deal with.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#93a1b2]">
              &ldquo;A personal service means dealing with one person — our director — throughout.&rdquo;
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#ece7db]/80 hover:text-[#ece7db]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#2a3442]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-hw-display)" }}>
                <AnimatedNumber value={30} suffix="+" />
              </p>
              <p className="mt-1 text-[11px] text-[#93a1b2] uppercase">Years in Glasgow property</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-hw-display)" }}>
                Sales &amp; lettings
              </p>
              <p className="mt-1 text-[11px] text-[#93a1b2] uppercase">Both handled in-house</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-hw-display)" }}>
                One director
              </p>
              <p className="mt-1 text-[11px] text-[#93a1b2] uppercase">Every enquiry, start to finish</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a15a] uppercase">What we handle</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#2a3442] bg-[#2a3442] sm:grid-cols-2">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="group flex h-full items-start gap-4 bg-[#10151c] p-7 transition-colors duration-300 hover:bg-[#182230]">
                <s.icon className="mt-0.5 size-5 shrink-0 text-[#c9a15a]" />
                <div>
                  <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-hw-display)" }}>
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#93a1b2]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What's live today — honest, real */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a15a] uppercase">What&apos;s live today</p>
          <div className="mt-6 overflow-hidden rounded-xl border border-[#2a3442] shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-[#2a3442] bg-[#0c1017] px-3 py-2">
              <span className="size-2.5 rounded-full bg-[#2a3442]" />
              <span className="size-2.5 rounded-full bg-[#2a3442]" />
              <span className="size-2.5 rounded-full bg-[#2a3442]" />
              <span className="ml-2 text-[11px] text-[#93a1b2]">home-west.co.uk</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-[#0e131b] px-6 py-14 text-center">
              <p className="text-lg text-[#93a1b2] italic" style={{ fontFamily: "var(--font-hw-display)" }}>
                &ldquo;Call or email the director directly.&rdquo;
              </p>
              <p className="mt-2 text-xs text-[#576374]">
                — no valuation form, enquiry form, or booking widget on the site today
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#0c1017] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a15a] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-hw-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a15a] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2a3442] bg-[#182230] p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-hw-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#93a1b2]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#576374]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — enquiry volume, valuation requests, response time saved — illustrative,
            not Home West&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2a3442] bg-[#10151c] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-semibold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-hw-display)" }}
          >
            Thirty years of trust deserves a front door that keeps up.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#c9a15a] underline underline-offset-4 hover:text-[#d9b578]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#0c1017] px-6 pb-10 pt-8 text-center text-[11px] text-[#576374]">
        Home West · 20-23 Woodside Place, Glasgow, G3 7QL
        <br />
        Built from publicly available information only — not affiliated with or published by Home West.
      </footer>
    </div>
  );
}
