"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

const MENU = [
  { name: "Huevos rancheros", price: "Brunch" },
  { name: "Sourdough toast, poached egg or avocado", price: "Brunch" },
  { name: "Waffles with bacon", price: "Brunch" },
  { name: "Reuben sandwich", price: "Lunch" },
];

const TAGS = ["Locally roasted coffee", "Gluten-free & vegan friendly", "Dog-friendly — every dog gets a treat", "Walk-ins only, no booking"];

const CHIPS = [
  { stat: "0", label: "pages of their own website — only Facebook and directory listings" },
  { stat: "#11", label: "of 190 restaurants in Dunfermline, per Tripadvisor" },
  { stat: "24/7", label: "an assistant could be answering, cafe open or not" },
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

// Coffee-ring stains — overlapping translucent circles, evoking cup marks
// on a table. Distinct from the tree-ring and ledger-line motifs used on
// the other concept pages, and thematically apt for a cafe.
function RingMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      <circle cx="220" cy="200" r="140" fill="none" stroke="#c1613f" strokeWidth="10" opacity="0.16" />
      <circle cx="380" cy="340" r="100" fill="none" stroke="#c1613f" strokeWidth="8" opacity="0.14" />
      <circle cx="300" cy="440" r="60" fill="none" stroke="#c1613f" strokeWidth="6" opacity="0.18" />
      <circle cx="140" cy="380" r="45" fill="none" stroke="#c1613f" strokeWidth="5" opacity="0.15" />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi, I'm Cafe Wynd's AI assistant. Ask me anything.";
const SUGGESTED = ["What's on the menu?", "Are you dog-friendly?", "Do I need to book?"];

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
      const res = await fetch("/api/concepts/cafe-wynd/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#54402f] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#54402f] bg-[#33241a] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#c1613f]/60" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-[#c9b8a8] uppercase">Cafe Wynd — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#3d2a20] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#c1613f] px-3 py-2 text-sm text-[#fdf8f2]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#4a3527] px-3 py-2 text-sm whitespace-pre-line text-[#fdf8f2]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#4a3527] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#c9b8a8] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c9b8a8] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#c9b8a8]" />
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
                className="rounded-full border border-[#54402f] px-3 py-1.5 text-xs text-[#c9b8a8] transition-colors hover:border-[#c1613f] hover:text-[#fdf8f2]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#54402f] bg-[#33241a] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#54402f] bg-[#3d2a20] px-3 text-sm text-[#fdf8f2] outline-none placeholder:text-[#8a7663] focus-visible:border-[#c1613f]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#c1613f] text-[#fdf8f2] transition-colors hover:bg-[#d1734f] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function CafeWyndConcept() {
  return (
    <div className="min-h-screen bg-[#f7f2e9] text-[#2c1f16]">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#3d2a20] px-4 py-1.5 text-center text-[11px] text-[#c9b8a8]">
        <span>
          Concept by <span className="text-[#fdf8f2]">Hamish AI</span> for{" "}
          <span className="text-[#fdf8f2]">Cafe Wynd</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#fdf8f2] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#3d2a20] text-[#fdf8f2]">
        <Image
          src="/images/concepts/cafe-wynd/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3d2a20] via-[#3d2a20]/90 to-[#3d2a20]/60" />
        <RingMotif className="pointer-events-none absolute top-1/2 right-[-8%] size-[600px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-[#e0a685] uppercase">Dunfermline · Fife</p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold text-balance md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Dunfermline&apos;s favourite
              <br />
              <span className="text-[#e0a685]">independent cafe.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#c9b8a8]">
              Locally roasted coffee, homemade bakes, and a treat for every dog that walks in — ranked #11 of 190
              restaurants in town.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#fdf8f2]/80 hover:text-[#fdf8f2]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#54402f]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-8 text-center">
            <Reveal>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={4.7} decimals={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#c9b8a8] uppercase">Tripadvisor rating</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                <AnimatedNumber value={815} />
              </p>
              <p className="mt-1 text-[11px] text-[#c9b8a8] uppercase">Restaurant Guru reviews</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                #11 / 190
              </p>
              <p className="mt-1 text-[11px] text-[#c9b8a8] uppercase">Restaurants in Dunfermline</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* On the menu */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-[#c1613f] uppercase">On the menu</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            What people order, again and again.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#e9dfd0] bg-white">
            {MENU.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${i > 0 ? "border-t border-[#e9dfd0]" : ""}`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="tabular-nums text-[#8a7663]">{m.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8a7663]">
            Brunch and lunch typically run £10–£20 per person — the full menu changes seasonally.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#e9dfd0] bg-white px-3 py-1.5 text-xs text-[#6b5a4a]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment */}
      <section className="relative overflow-hidden bg-[#c1613f] px-6 py-24 text-[#3d2a20]">
        <Reveal>
          <blockquote
            className="mx-auto max-w-3xl text-center text-3xl leading-tight font-medium text-balance italic md:text-5xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            &ldquo;The only dog-friendly place I could find in the whole of Dunfermline.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Tripadvisor review
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#3d2a20] px-6 py-24 text-[#fdf8f2]">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.2em] text-[#e0a685] uppercase">Live demo</p>
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
          <p className="font-mono text-xs tracking-[0.2em] text-[#c1613f] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#e9dfd0] bg-white p-6">
                <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#6b5a4a]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a7663]">
            <ShieldCheck className="size-3.5" />
            AI Business Analytics teaser — busiest hours, repeat-visit rate, most-asked questions — illustrative,
            not Cafe Wynd&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#54402f] bg-[#3d2a20] px-6 py-24 text-center text-[#fdf8f2]">
        <Reveal>
          <p className="mx-auto max-w-xl text-2xl font-medium text-balance md:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            A cafe this loved deserves to be found.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#e0a685] underline underline-offset-4 hover:text-[#eebb9e]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#3d2a20] px-6 pb-10 text-center text-[11px] text-[#8a7663]">
        Cafe Wynd · 10 Cross Wynd, Dunfermline, Fife, KY12 7AP
        <br />
        Built from publicly available information only — not affiliated with or published by Cafe Wynd.
      </footer>
    </div>
  );
}
