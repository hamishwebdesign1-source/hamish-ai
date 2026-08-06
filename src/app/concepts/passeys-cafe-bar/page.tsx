"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Alegreya, Jost } from "next/font/google";
import { Send, ChefHat, Leaf, Dog, Award, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Alegreya is an elegant,
// slightly characterful serif with real dynamic contrast — proper
// seaside-bistro signage rather than a startup display face; Jost
// carries the body copy with a clean, breezy geometric feel.
const display = Alegreya({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-passey-display",
});
const body = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-passey-body",
});

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

// Gentle wave lines — evokes the Portobello seafront, kept from the
// original build and recoloured to the new navy/coral palette. Each
// layer scrolls left at its own speed — actual lapping water, not just a
// static line. The path is drawn one extra 150px period wider than the
// viewBox (T750) so the loop has no seam once it's shifted exactly one
// period by motif-wave-scroll.
function WaveMotif({ className }: { className?: string }) {
  const layers = [
    { y: 330, opacity: 0.16, duration: 9 },
    { y: 355, opacity: 0.13, duration: 6.5 },
    { y: 380, opacity: 0.1, duration: 4.5 },
  ];
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      {layers.map((l) => (
        <path
          key={l.y}
          d={`M0 ${l.y} Q75 ${l.y - 22} 150 ${l.y} T300 ${l.y} T450 ${l.y} T600 ${l.y} T750 ${l.y} V400 H0 Z`}
          fill="#e8603f"
          opacity={l.opacity}
          className="motif-anim [animation:motif-wave-scroll_linear_infinite]"
          style={{ animationDuration: `${l.duration}s` }}
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
    <div className="overflow-hidden rounded-xl border border-[#1c374d] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#1c374d] bg-[#081826] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#e8603f]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#9db3c2] uppercase">
          Passey&apos;s — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#0d2033] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8603f] px-3 py-2 text-sm text-[#0d2033]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#142a3d] px-3 py-2 text-sm whitespace-pre-line text-[#f4f0e6]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#142a3d] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db3c2] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db3c2] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9db3c2]" />
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
                className="rounded-full border border-[#1c374d] px-3 py-1.5 text-xs text-[#9db3c2] transition-colors hover:border-[#e8603f] hover:text-[#f4f0e6]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#1c374d] bg-[#081826] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#1c374d] bg-[#0d2033] px-3 text-sm text-[#f4f0e6] outline-none placeholder:text-[#5c7386] focus-visible:border-[#e8603f]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e8603f] text-[#0d2033] transition-colors hover:bg-[#f0794f] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function PasseysConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#f0e6d2] text-[#10263a]`}
      style={{ fontFamily: "var(--font-passey-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#081826] px-4 py-1.5 text-center text-[11px] text-[#9db3c2]">
        <span>
          Concept by <span className="text-[#f4f0e6]">Hamish AI</span> for{" "}
          <span className="text-[#f4f0e6]">Passey&apos;s Cafe Bar &amp; Bistro</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f4f0e6] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#0d2033] text-[#f4f0e6]">
        <Image
          src="/images/concepts/passeys-cafe-bar/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d2033] via-[#0d2033]/90 to-[#0d2033]/55" />
        <WaveMotif className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] w-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#e8603f] text-lg font-bold text-[#e8603f] italic"
                style={{ fontFamily: "var(--font-passey-display)" }}
                aria-hidden
              >
                P
              </span>
              <span
                className="text-2xl font-bold tracking-tight text-[#f4f0e6]"
                style={{ fontFamily: "var(--font-passey-display)" }}
              >
                Passey&apos;s
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#e8603f] uppercase">
              Portobello · Edinburgh
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-bold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-passey-display)" }}
            >
              Portobello&apos;s
              <br />
              <span className="text-[#e8603f] italic">award-winning corner cafe.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#9db3c2]">
              A Good Food Awards Blue Ribbon winner, made on site with locally sourced ingredients.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f4f0e6]/80 hover:text-[#f4f0e6]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#1c374d]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ fontFamily: "var(--font-passey-display)" }}
              >
                <AnimatedNumber value={123} />
              </p>
              <p className="mt-1 text-[11px] text-[#9db3c2] uppercase">Tripadvisor reviews</p>
            </Reveal>
            <Reveal delay={80}>
              <p
                className="flex items-center justify-center gap-1.5 text-2xl font-bold"
                style={{ fontFamily: "var(--font-passey-display)" }}
              >
                <Award className="size-5 text-[#e8603f]" />
                2022
              </p>
              <p className="mt-1 text-[11px] text-[#9db3c2] uppercase">Good Food Blue Ribbon</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-passey-display)" }}>
                11 yrs
              </p>
              <p className="mt-1 text-[11px] text-[#9db3c2] uppercase">Best breakfast, per one local</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#96351f] uppercase">What people love</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.title} delay={i * 80}>
              <div className="group h-full rounded-xl border border-[#ddcda8] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#e8603f] hover:shadow-xl">
                <h.icon className="size-6 text-[#96351f] transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-4 text-lg font-bold" style={{ fontFamily: "var(--font-passey-display)" }}>
                  {h.title}
                </p>
                <p className="mt-1.5 text-sm text-[#4a5c6d]">{h.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#e8603f] px-6 py-24 text-[#10263a]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-bold text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-passey-display)" }}
          >
            &ldquo;Best breakfast I&apos;ve had in 11 years of living in Portobello.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Tripadvisor review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#081826] px-6 py-24 text-[#f4f0e6]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e8603f] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl" style={{ fontFamily: "var(--font-passey-display)" }}>
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#96351f] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#ddcda8] bg-white p-6">
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-passey-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#4a5c6d]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#5c6f80]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — brunch-rush timing, table turnover, repeat-visit rate — illustrative, not
            Passey&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#1c374d] bg-[#0d2033] px-6 py-24 text-center text-[#f4f0e6]">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-bold text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-passey-display)" }}
          >
            An award-winning kitchen deserves a working front door.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#e8603f] underline underline-offset-4 hover:text-[#f0794f]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#081826] px-6 pb-10 pt-8 text-center text-[11px] text-[#5c7386]">
        Passey&apos;s Cafe Bar &amp; Bistro · 272 Portobello High Street, Edinburgh
        <br />
        Built from publicly available information only — not affiliated with or published by Passey&apos;s.
      </footer>
    </div>
  );
}
