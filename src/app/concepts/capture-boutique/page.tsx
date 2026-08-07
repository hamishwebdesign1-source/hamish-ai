"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Italiana, Jost } from "next/font/google";
import { Send, Shirt, Gem, Tag, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only. Italiana is a thin,
// editorial fashion-magazine serif; Jost carries the body with a
// geometric, boutique-catalogue feel.
const display = Italiana({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-cb-display",
});
const body = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cb-body",
});

const COLLECTION = [
  { icon: Shirt, title: "Women's clothing", body: "Everyday pieces through to occasionwear" },
  { icon: Gem, title: "Accessories & jewellery", body: "Curated to pair with the current collection" },
  { icon: Tag, title: "New in, every season", body: "Alison's own picks, refreshed regularly" },
];

const CHIPS = [
  { stat: "0", label: "pages of their own website resolving on Henderson Street's own high street" },
  { stat: "30", label: "reviews on file across independent directories" },
  { stat: "24/7", label: "an assistant could be answering \"are you open\" questions, domain down or not" },
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

// A row of hangers on a rail — a boutique fitting room, not a literal
// photo of any specific rack. Each hanger sways very slightly, as if the
// door just swung shut.
function HangerMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden fill="none">
      <line x1="20" y1="30" x2="580" y2="30" stroke="#b8996b" strokeWidth="1.5" opacity="0.3" />
      {Array.from({ length: 8 }).map((_, i) => (
        <g
          key={i}
          className="motif-anim [animation:motif-sway_5s_ease-in-out_infinite]"
          style={{ transformOrigin: `${60 + i * 70}px 30px`, animationDelay: `${i * 220}ms` } as React.CSSProperties}
        >
          <path
            d={`M${60 + i * 70} 30 L${60 + i * 70} 55 M${40 + i * 70} 55 L${80 + i * 70} 55 L${60 + i * 70} 90 L${40 + i * 70} 55`}
            stroke="#b8996b"
            strokeWidth="1.5"
            opacity={0.28 - (i % 3) * 0.05}
          />
        </g>
      ))}
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Capture Boutique's AI assistant. Ask me anything.";
const SUGGESTED = ["What kind of clothing do you stock?", "Where are you based?", "Do you have new arrivals in?"];

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
      const res = await fetch("/api/concepts/capture-boutique/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#2e2925] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#2e2925] bg-[#100e0b] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#b8996b]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#a89a86] uppercase">
          Capture Boutique — live
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#161310] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#b8996b] px-3 py-2 text-sm text-[#161310]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#211c17] px-3 py-2 text-sm whitespace-pre-line text-[#f0ebe3]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#211c17] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#a89a86] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a89a86] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a89a86]" />
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
                className="rounded-full border border-[#2e2925] px-3 py-1.5 text-xs text-[#a89a86] transition-colors hover:border-[#b8996b] hover:text-[#f0ebe3]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#2e2925] bg-[#100e0b] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#2e2925] bg-[#161310] px-3 text-sm text-[#f0ebe3] outline-none placeholder:text-[#5c5449] focus-visible:border-[#b8996b]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#b8996b] text-[#161310] transition-colors hover:bg-[#c9ac82] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function CaptureBoutiqueConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#161310] text-[#f0ebe3]`}
      style={{ fontFamily: "var(--font-cb-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#100e0b] px-4 py-1.5 text-center text-[11px] text-[#a89a86]">
        <span>
          Concept by <span className="text-[#f0ebe3]">Hamish AI</span> for{" "}
          <span className="text-[#f0ebe3]">Capture Boutique</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f0ebe3] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#161310]">
        <Image
          src="/images/concepts/capture-boutique/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161310] via-[#161310]/92 to-[#161310]/60" />
        <HangerMotif className="pointer-events-none absolute inset-x-0 top-0 h-[220px] w-full" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border border-[#b8996b] text-lg text-[#b8996b]"
                style={{ fontFamily: "var(--font-cb-display)" }}
                aria-hidden
              >
                C
              </span>
              <span
                className="text-2xl tracking-[0.1em] text-[#f0ebe3] uppercase"
                style={{ fontFamily: "var(--font-cb-display)" }}
              >
                Capture Boutique
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-medium tracking-[0.25em] text-[#b8996b] uppercase">
              Henderson Street · Bridge of Allan
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.1] font-normal text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-cb-display)" }}
            >
              A boutique on the high street,
              <br />
              <span className="text-[#b8996b]">invisible everywhere else.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#a89a86]">
              Alison&apos;s shop, built from her own former store — but the website isn&apos;t loading for anyone
              searching it.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f0ebe3]/80 hover:text-[#f0ebe3]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#2e2925]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-normal tabular-nums" style={{ fontFamily: "var(--font-cb-display)" }}>
                <AnimatedNumber value={30} />
              </p>
              <p className="mt-1 text-[11px] text-[#a89a86] uppercase">Reviews on file</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-normal" style={{ fontFamily: "var(--font-cb-display)" }}>
                Independent
              </p>
              <p className="mt-1 text-[11px] text-[#a89a86] uppercase">Owner-run, by Alison</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-normal" style={{ fontFamily: "var(--font-cb-display)" }}>
                High street
              </p>
              <p className="mt-1 text-[11px] text-[#a89a86] uppercase">Henderson Street, Bridge of Allan</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* In the shop */}
      <section id="services" className="mx-auto max-w-4xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-medium tracking-[0.2em] text-[#b8996b] uppercase">In the shop</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#2e2925] bg-[#2e2925] sm:grid-cols-3">
          {COLLECTION.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className="group flex h-full flex-col gap-3 bg-[#161310] p-7 transition-colors duration-300 hover:bg-[#211c17]">
                <c.icon className="size-5 shrink-0 text-[#b8996b]" />
                <div>
                  <p className="text-lg font-normal" style={{ fontFamily: "var(--font-cb-display)" }}>
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm text-[#a89a86]">{c.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={240}>
          <p className="mt-4 text-xs text-[#5c5449]">
            Capture Boutique brings together Alison&apos;s former store, Country Pursuits, with a new boutique
            collection under one roof.
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#100e0b] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-medium tracking-[0.2em] text-[#b8996b] uppercase">Live demo</p>
            <h2 className="mt-3 text-3xl font-normal md:text-4xl" style={{ fontFamily: "var(--font-cb-display)" }}>
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
          <p className="text-xs font-medium tracking-[0.2em] text-[#b8996b] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#2e2925] bg-[#211c17] p-6">
                <p className="text-3xl font-normal" style={{ fontFamily: "var(--font-cb-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#a89a86]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#5c5449]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — most-asked-about pieces, footfall by day, new-arrival interest —
            illustrative, not Capture Boutique&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#2e2925] bg-[#161310] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-normal text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-cb-display)" }}
          >
            A boutique this considered deserves a window people can actually find.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#b8996b] underline underline-offset-4 hover:text-[#c9ac82]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#100e0b] px-6 pb-10 pt-8 text-center text-[11px] text-[#5c5449]">
        Capture Boutique · 47A Henderson Street, Bridge of Allan, Stirling, FK9 4HG
        <br />
        Built from publicly available information only — not affiliated with or published by Capture Boutique.
      </footer>
    </div>
  );
}
