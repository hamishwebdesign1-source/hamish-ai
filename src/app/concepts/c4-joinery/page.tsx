"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Send,
  Sofa,
  LayoutGrid,
  DoorClosed,
  Fence,
  ArrowDown,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const CRAFT = [
  {
    icon: Sofa,
    title: "Bespoke joinery",
    body: "Furniture, fitted wardrobes, cabinetry",
    image: "/images/concepts/c4-joinery/bespoke-joinery.jpg",
  },
  {
    icon: LayoutGrid,
    title: "Extensions & conversions",
    body: "Lofts, home extensions",
    image: "/images/concepts/c4-joinery/extensions.jpg",
  },
  {
    icon: DoorClosed,
    title: "Kitchens, doors & stairs",
    body: "Installations, repairs, balustrades",
    image: "/images/concepts/c4-joinery/stairs.jpg",
  },
  {
    icon: Fence,
    title: "Finishing touches",
    body: "Flooring, decking, bathroom refurbishment",
    image: "/images/concepts/c4-joinery/finishing-touches.jpg",
  },
];

const CHIPS = [
  { stat: "0", label: "search results point to a site you control" },
  { stat: "5.0★", label: "sitting on a directory, not your own front door" },
  { stat: "24/7", label: "an assistant could be answering, phone or not" },
];

// Counts up on mount rather than gating behind an IntersectionObserver —
// this section sits right below the hero, so "scroll into view" and
// "page load" are effectively the same moment, and removing the observer
// removes an entire class of timing bug for one visual flourish.
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

function GrainMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {[80, 140, 200, 260, 320, 380].map((r, i) => (
        <ellipse
          key={r}
          cx="300"
          cy="300"
          rx={r}
          ry={r * 0.92}
          fill="none"
          stroke="#c08a4e"
          strokeWidth="1"
          opacity={0.14 - i * 0.014}
        />
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm C4 Joinery's AI assistant. Ask me anything.";
const SUGGESTED = ["What do you build?", "How do I get a quote?", "Are you reliable?"];

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
      const res = await fetch("/api/concepts/c4-joinery/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#3a332c] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#3a332c] bg-[#1f1b19] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c08a4e]/50" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#a89e94] uppercase">C4 Joinery — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#141110] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c08a4e] px-3 py-2 text-sm text-[#141110]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#28221e] px-3 py-2 text-sm whitespace-pre-line text-[#f5f1ea]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#28221e] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#a89e94] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a89e94] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a89e94]" />
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
                className="rounded-full border border-[#3a332c] px-3 py-1.5 text-xs text-[#a89e94] transition-colors hover:border-[#c08a4e] hover:text-[#f5f1ea]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#3a332c] bg-[#1f1b19] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#3a332c] bg-[#141110] px-3 text-sm text-[#f5f1ea] outline-none placeholder:text-[#6b6259] focus-visible:border-[#c08a4e]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c08a4e] text-[#141110] transition-colors hover:bg-[#d19c5f] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function C4JoineryConcept() {
  return (
    <div className="min-h-screen bg-[#f5f1ea] text-[#1f1b19]">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#141110] px-4 py-1.5 text-center text-[11px] text-[#8a8177]">
        <span>
          Concept by <span className="text-[#f5f1ea]">Hamish AI</span> for{" "}
          <span className="text-[#f5f1ea]">C4 Joinery Ltd</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f5f1ea] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#141110] text-[#f5f1ea]">
        <Image
          src="/images/concepts/c4-joinery/hero-workshop.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141110] via-[#141110]/90 to-[#141110]/50" />
        <GrainMotif className="pointer-events-none absolute top-1/2 right-[-10%] size-[700px] -translate-y-1/2 opacity-70" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 md:pt-36 md:pb-40">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-[#c08a4e] uppercase">Linwood · Renfrewshire</p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-3xl text-6xl leading-[0.95] font-semibold tracking-tight text-balance md:text-8xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Craft you can <span className="text-[#c08a4e] italic">trust.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 max-w-md text-lg text-[#a89e94]">
              Family joinery. Five-star work. Building in Renfrewshire since 2023.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-[#f5f1ea]/80 hover:text-[#f5f1ea]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[#28221e] bg-[#141110] text-[#f5f1ea]">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-16 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-1 text-[#c08a4e]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <p className="mt-3 text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              <AnimatedNumber value={5} decimals={1} />
            </p>
            <p className="mt-1 text-xs text-[#8a8177] uppercase">Average rating</p>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              <AnimatedNumber value={32} />
            </p>
            <p className="mt-1 text-xs text-[#8a8177] uppercase">Customer reviews</p>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              <AnimatedNumber value={2023} decimals={0} />
            </p>
            <p className="mt-1 text-xs text-[#8a8177] uppercase">Trusted Trader since</p>
          </Reveal>
        </div>
      </section>

      {/* Craft */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#c08a4e] uppercase">What we build</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CRAFT.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className="group h-full overflow-hidden rounded-xl border border-[#e4dccc] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#c08a4e] hover:shadow-xl">
                <div className="relative h-40 w-full overflow-hidden bg-[#141110]">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <c.icon className="absolute bottom-3 left-3 size-5 text-white drop-shadow-md" />
                </div>
                <div className="p-7">
                  <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#6b6259]">{c.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={CRAFT.length * 80}>
          <p className="mt-6 text-xs text-[#8a8177]">
            Styled with concept photography — your own project photos would replace these on the real build.
          </p>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#c08a4e] px-6 py-24 text-[#141110]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-medium text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            &ldquo;Nothing was ever a hassle or bother.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Trusted Trader review · Renfrewshire
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#141110] px-6 py-24 text-[#f5f1ea]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.2em] text-[#c08a4e] uppercase">Live demo</p>
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
          <p className="font-mono text-xs tracking-[0.2em] text-[#c08a4e] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e4dccc] bg-white p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#6b6259]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a8177]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — quote conversion, job profitability, callout response — illustrative,
            not C4 Joinery&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#28221e] bg-[#141110] px-6 py-24 text-center text-[#f5f1ea]">
        <Reveal>
          <p className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            This is what craftsmanship looks like online.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#c08a4e] underline underline-offset-4 hover:text-[#d19c5f]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#141110] px-6 pb-10 text-center text-[11px] text-[#6b6259]">
        C4 Joinery Ltd · Mossedge Industrial Estate, Moss Road, Linwood, PA3 3HR · 07483 491 710
        <br />
        Built from publicly available information only — not affiliated with or published by C4 Joinery Ltd.
      </footer>
    </div>
  );
}
