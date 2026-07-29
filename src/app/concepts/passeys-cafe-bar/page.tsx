"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, ChefHat, Leaf, Dog, Award, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

const HIGHLIGHTS = [
  { icon: ChefHat, title: "Made on site", body: "By their own chefs, every day" },
  { icon: Leaf, title: "Locally sourced", body: "Fresh ingredients, always" },
  { icon: Award, title: "Award-winning", body: "Good Food Awards 2022 Blue Ribbon" },
  { icon: Dog, title: "Dog-friendly", body: "A home from home for everyone" },
];

const CHIPS = [
  { stat: "Down", label: "the actual state of their website right now — it doesn't load at all" },
  { stat: "123", label: "Tripadvisor reviews for an award-winning breakfast spot" },
  { stat: "24/7", label: "an assistant could be answering, kitchen open or not" },
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

// Gentle wave lines — evokes the Portobello seafront rather than
// decoration for its own sake, distinct from the other concept motifs.
function WaveMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      {[330, 355, 380].map((y, i) => (
        <path
          key={y}
          d={`M0 ${y} Q75 ${y - 22} 150 ${y} T300 ${y} T450 ${y} T600 ${y} V400 H0 Z`}
          fill="#2f8fa0"
          opacity={0.14 - i * 0.03}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Passey's AI assistant. Ask me anything.";
const SUGGESTED = ["What's good for breakfast?", "Are you dog-friendly?", "Where are you based?"];

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
      const res = await fetch("/api/concepts/passeys-cafe-bar/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#243e44] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#243e44] bg-[#0f1c20] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#2f8fa0]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#9db9bd] uppercase">
          Passey&apos;s — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#16262c] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#2f8fa0] px-3 py-2 text-sm text-[#f4f8f7]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#1e343a] px-3 py-2 text-sm whitespace-pre-line text-[#f4f8f7]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#1e343a] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db9bd] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db9bd] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db9bd]" />
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
                className="rounded-full border border-[#243e44] px-3 py-1.5 text-xs text-[#9db9bd] transition-colors hover:border-[#2f8fa0] hover:text-[#f4f8f7]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#243e44] bg-[#0f1c20] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#243e44] bg-[#16262c] px-3 text-sm text-[#f4f8f7] outline-none placeholder:text-[#5f7d82] focus-visible:border-[#2f8fa0]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#2f8fa0] text-[#16262c] transition-colors hover:bg-[#3fa1b3] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function PasseysConcept() {
  return (
    <div className="min-h-screen bg-[#f7f1e4] text-[#16262c]">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#16262c] px-4 py-1.5 text-center text-[11px] text-[#9db9bd]">
        <span>
          Concept by <span className="text-[#f4f8f7]">Hamish AI</span> for{" "}
          <span className="text-[#f4f8f7]">Passey&apos;s Cafe Bar &amp; Bistro</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f4f8f7] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#16262c] text-[#f4f8f7]">
        <Image
          src="/images/concepts/passeys-cafe-bar/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16262c] via-[#16262c]/90 to-[#16262c]/55" />
        <WaveMotif className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] w-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-[#7bc5d3] uppercase">Portobello · Edinburgh</p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Portobello&apos;s
              <br />
              <span className="text-[#7bc5d3]">award-winning corner cafe.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#9db9bd]">
              A Good Food Awards Blue Ribbon winner, made on site with locally sourced ingredients.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f4f8f7]/80 hover:text-[#f4f8f7]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#243e44]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={123} />
              </p>
              <p className="mt-1 text-[11px] text-[#9db9bd] uppercase">Tripadvisor reviews</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="flex items-center justify-center gap-1.5 text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                <Award className="size-5 text-[#7bc5d3]" />
                2022
              </p>
              <p className="mt-1 text-[11px] text-[#9db9bd] uppercase">Good Food Blue Ribbon</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                11 yrs
              </p>
              <p className="mt-1 text-[11px] text-[#9db9bd] uppercase">Best breakfast, per one local</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#2f8fa0] uppercase">What people love</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.title} delay={i * 80}>
              <div className="group h-full rounded-xl border border-[#e6ddc8] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#2f8fa0] hover:shadow-xl">
                <h.icon className="size-6 text-[#2f8fa0] transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {h.title}
                </p>
                <p className="mt-1.5 text-sm text-[#4d5f61]">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#2f8fa0] px-6 py-24 text-[#16262c]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-medium text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            &ldquo;Best breakfast I&apos;ve had in 11 years of living in Portobello.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Tripadvisor review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#16262c] px-6 py-24 text-[#f4f8f7]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.2em] text-[#7bc5d3] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
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
          <p className="font-mono text-xs tracking-[0.2em] text-[#2f8fa0] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e6ddc8] bg-white p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#4d5f61]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#6b7f82]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — brunch-rush timing, table turnover, repeat-visit rate — illustrative, not
            Passey&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#243e44] bg-[#16262c] px-6 py-24 text-center text-[#f4f8f7]">
        <Reveal>
          <p className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            An award-winning kitchen deserves a working front door.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#7bc5d3] underline underline-offset-4 hover:text-[#9bd6e0]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#16262c] px-6 pb-10 text-center text-[11px] text-[#6b7f82]">
        Passey&apos;s Cafe Bar &amp; Bistro · 272 Portobello High Street, Edinburgh
        <br />
        Built from publicly available information only — not affiliated with or published by Passey&apos;s.
      </footer>
    </div>
  );
}
