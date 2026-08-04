"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Big_Shoulders, Work_Sans } from "next/font/google";
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

// A distinct pairing for this business only — not the site's shared
// Fraunces/DM Sans, and not reused on any other concept page. Big
// Shoulders reads like stamped crate lettering / van signage; Work Sans
// carries the body copy plainly so the display face stays the one loud
// voice on the page.
const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-c4-display",
});
const body = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-c4-body",
});

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

// A technical joinery mark — interlocking dovetail pins plus a dimension
// line with tick marks, like a page torn from a shop drawing — standing
// in for the generic concentric "wood grain rings" motif every other
// warm-cream AI site reaches for.
function DovetailMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 420" className={className} aria-hidden fill="none">
      <g stroke="#d8501f" strokeWidth="1.4" opacity="0.55">
        <path d="M30 40 L95 40 L118 100 L95 160 L30 160 Z" />
        <path d="M118 40 L183 40 L160 100 L183 160 L118 160 Z" opacity="0.6" />
        <path d="M30 210 L95 210 L118 270 L95 330 L30 330 Z" />
        <path d="M118 210 L183 210 L160 270 L183 330 L118 330 Z" opacity="0.6" />
      </g>
      <g stroke="#8a7f70" strokeWidth="1" opacity="0.5">
        <line x1="230" y1="20" x2="230" y2="400" strokeDasharray="2 7" />
        <line x1="220" y1="30" x2="240" y2="30" />
        <line x1="220" y1="390" x2="240" y2="390" />
        <line x1="250" y1="30" x2="290" y2="30" strokeDasharray="2 7" />
        <line x1="250" y1="390" x2="290" y2="390" strokeDasharray="2 7" />
      </g>
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
    <div className="overflow-hidden rounded-xl border border-[#362c22] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#362c22] bg-[#1a1510] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#d8501f]/50" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#9c9184] uppercase">C4 Joinery — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#120e0b] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#d8501f] px-3 py-2 text-sm text-[#120e0b]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#231c15] px-3 py-2 text-sm whitespace-pre-line text-[#f1ece2]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#231c15] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#9c9184] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9c9184] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#9c9184]" />
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
                className="rounded-full border border-[#362c22] px-3 py-1.5 text-xs text-[#9c9184] transition-colors hover:border-[#d8501f] hover:text-[#f1ece2]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#362c22] bg-[#1a1510] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#362c22] bg-[#120e0b] px-3 text-sm text-[#f1ece2] outline-none placeholder:text-[#6b6259] focus-visible:border-[#d8501f]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#d8501f] text-[#120e0b] transition-colors hover:bg-[#e56534] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function C4JoineryConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#15110d] text-[#f1ece2]`}
      style={{ fontFamily: "var(--font-c4-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#0f0c09] px-4 py-1.5 text-center text-[11px] text-[#9c9184]">
        <span>
          Concept by <span className="text-[#f1ece2]">Hamish AI</span> for{" "}
          <span className="text-[#f1ece2]">C4 Joinery Ltd</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f1ece2] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#15110d]">
        <Image
          src="/images/concepts/c4-joinery/hero-workshop.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15110d] via-[#15110d]/92 to-[#15110d]/55" />
        <DovetailMotif className="pointer-events-none absolute top-1/2 right-[-6%] size-[460px] -translate-y-1/2 opacity-80" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 md:pt-36 md:pb-40">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.25em] text-[#d8501f] uppercase">Linwood · Renfrewshire</p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-3xl text-7xl leading-[0.9] font-black tracking-tight text-balance uppercase md:text-[8.5rem]"
              style={{ fontFamily: "var(--font-c4-display)" }}
            >
              Craft you can <span className="text-[#d8501f]">trust.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 max-w-md text-lg text-[#a89e8f]">
              Family joinery. Five-star work. Building in Renfrewshire since 2023.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-[#f1ece2]/80 hover:text-[#f1ece2]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[#231c15] bg-[#15110d]">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-16 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-1 text-[#d8501f]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <p
              className="mt-3 text-4xl font-black tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-c4-display)" }}
            >
              <AnimatedNumber value={5} decimals={1} />
            </p>
            <p className="mt-1 text-xs text-[#8a7f70] uppercase">Average rating</p>
          </Reveal>
          <Reveal delay={100}>
            <p
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-c4-display)" }}
            >
              <AnimatedNumber value={32} />
            </p>
            <p className="mt-1 text-xs text-[#8a7f70] uppercase">Customer reviews</p>
          </Reveal>
          <Reveal delay={200}>
            <p
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-c4-display)" }}
            >
              <AnimatedNumber value={2023} decimals={0} />
            </p>
            <p className="mt-1 text-xs text-[#8a7f70] uppercase">Trusted Trader since</p>
          </Reveal>
        </div>
      </section>

      {/* Craft */}
      <section id="services" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#d8501f] uppercase">What we build</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CRAFT.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className="group h-full overflow-hidden rounded-xl border border-[#362c22] bg-[#1a1510] transition-all duration-300 hover:-translate-y-1 hover:border-[#d8501f] hover:shadow-2xl">
                <div className="relative h-40 w-full overflow-hidden bg-[#0f0c09]">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c09]/70 to-transparent" />
                  <c.icon className="absolute bottom-3 left-3 size-5 text-[#f1ece2] drop-shadow-md" />
                </div>
                <div className="p-7">
                  <p
                    className="text-xl font-bold tracking-tight uppercase"
                    style={{ fontFamily: "var(--font-c4-display)" }}
                  >
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#a89e8f]">{c.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={CRAFT.length * 80}>
          <p className="mt-6 text-xs text-[#8a7f70]">
            Styled with concept photography — your own project photos would replace these on the real build.
          </p>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#2f4750] px-6 py-24 text-[#eef4f5]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-[1.05] font-bold tracking-tight text-balance md:text-5xl"
            style={{ fontFamily: "var(--font-c4-display)" }}
          >
            &ldquo;Nothing was ever a hassle or bother.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide text-[#c3d6da] uppercase">
            Trusted Trader review · Renfrewshire
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#15110d] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#d8501f] uppercase">Live demo</p>
            <h2
              className="mt-3 text-3xl font-black tracking-tight uppercase md:text-4xl"
              style={{ fontFamily: "var(--font-c4-display)" }}
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#d8501f] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#362c22] bg-[#1a1510] p-6">
                <p className="text-3xl font-black tracking-tight" style={{ fontFamily: "var(--font-c4-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#a89e8f]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a7f70]">
            <ShieldCheck className="size-3.5 text-[#7d9aa3]" />
            AI Business Analytics teaser — quote conversion, job profitability, callout response — illustrative,
            not C4 Joinery&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#231c15] bg-[#15110d] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-balance uppercase md:text-4xl"
            style={{ fontFamily: "var(--font-c4-display)" }}
          >
            This is what craftsmanship looks like online.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#d8501f] underline underline-offset-4 hover:text-[#e56534]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#0f0c09] px-6 pb-10 pt-8 text-center text-[11px] text-[#6b6259]">
        C4 Joinery Ltd · Mossedge Industrial Estate, Moss Road, Linwood, PA3 3HR · 07483 491 710
        <br />
        Built from publicly available information only — not affiliated with or published by C4 Joinery Ltd.
      </footer>
    </div>
  );
}
