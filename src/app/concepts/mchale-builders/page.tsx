"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Staatliches, IBM_Plex_Sans } from "next/font/google";
import { Send, ArrowDown, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";

// A distinct pairing for this business only — not the site's shared
// Fraunces/DM Sans, and not reused on any other concept page. Staatliches
// reads like stencilled site-board lettering (a builder's yard sign, a
// skip-hire hoarding); IBM Plex Sans carries the body copy with a plain,
// spec-sheet clarity that suits a trades business.
const display = Staatliches({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mchale-display",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mchale-body",
});

const SERVICES = [
  { name: "House extensions", body: "Living rooms, kitchens, bathrooms & garage conversions" },
  { name: "Attic & garage conversions", body: "Extra living space without moving house" },
  { name: "Kitchens & bathrooms", body: "Fully fitted installations" },
  { name: "Roofing & garden decking", body: "" },
  { name: "Windows, doors & driveways", body: "Plus wall & garage building work" },
  { name: "Plumbing", body: "Central heating, bathroom plumbing, boiler repairs & leaks" },
];

const TAGS = [
  "23 years of completed projects",
  "Most new work comes by word of mouth",
  "One point of contact, start to finish",
];

const CHIPS = [
  { stat: "0", label: "of their two listed domains actually load" },
  { stat: "0", label: "customer reviews found on any public directory" },
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

// A spirit level — the vial, its bubble, and a run of tape-measure ticks
// alongside it — standing in for the generic "crossed tools" or "hard hat"
// clip-art every trades site reaches for. The bubble drifts slightly off
// centre and settles, like a level actually being read on site.
function SpiritLevelMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 420" className={className} aria-hidden fill="none">
      <g stroke="#a8d94a" strokeWidth="2" opacity="0.55">
        <rect x="30" y="150" width="340" height="56" rx="6" />
        <rect x="30" y="150" width="340" height="56" rx="6" strokeWidth="1" opacity="0.4" />
      </g>
      <g
        className="motif-anim [animation:motif-cascade_3.4s_ease-in-out_infinite]"
        style={{ "--motif-opacity-min": 0.25, "--motif-opacity-max": 0.85 } as React.CSSProperties}
      >
        <circle cx="150" cy="178" r="30" stroke="#a8d94a" strokeWidth="1.5" fill="none" />
        <circle cx="158" cy="178" r="15" fill="#a8d94a" fillOpacity="0.5" />
        <line x1="150" y1="150" x2="150" y2="206" stroke="#a8d94a" strokeWidth="1" opacity="0.6" />
      </g>
      <g stroke="#8a8074" strokeWidth="1" opacity="0.45">
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={i}
            x1={50 + i * 22}
            y1="230"
            x2={50 + i * 22}
            y2={i % 3 === 0 ? "260" : "248"}
            className="motif-anim [animation:motif-dash-crawl_3s_linear_infinite]"
          />
        ))}
      </g>
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hello, I'm McHale's AI assistant. Ask me anything.";
const SUGGESTED = ["What do you build?", "How do I get a quote?", "Do you do bathrooms?"];

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
      const res = await fetch("/api/concepts/mchale-builders/chat", {
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
    <div className="overflow-hidden rounded-xl border border-[#3a352c] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-[#3a352c] bg-[#161410] px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full bg-[#a8d94a]/50" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide text-[#a49c8c] uppercase">McHale — live</span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto bg-[#100e0b] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#a8d94a] px-3 py-2 text-sm text-[#161410]"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[#221e17] px-3 py-2 text-sm whitespace-pre-line text-[#f4f1e6]"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[#221e17] px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-[#a49c8c] [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a49c8c] [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-[#a49c8c]" />
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
                className="rounded-full border border-[#3a352c] px-3 py-1.5 text-xs text-[#a49c8c] transition-colors hover:border-[#a8d94a] hover:text-[#f4f1e6]"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-[#3a352c] bg-[#161410] p-3"
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
          className="h-9 flex-1 rounded-md border border-[#3a352c] bg-[#100e0b] px-3 text-sm text-[#f4f1e6] outline-none placeholder:text-[#6b6259] focus-visible:border-[#a8d94a]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#a8d94a] text-[#161410] transition-colors hover:bg-[#bce56a] disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function McHaleBuildersConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#1c1a17] text-[#f4f1e6]`}
      style={{ fontFamily: "var(--font-mchale-body)" }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#141210] px-4 py-1.5 text-center text-[11px] text-[#a49c8c]">
        <span>
          Concept by <span className="text-[#f4f1e6]">Hamish AI</span> for{" "}
          <span className="text-[#f4f1e6]">PJ McHale Joiners &amp; Builders</span> — not their current site.
        </span>
        <Link href="https://hamishai.org" className="text-[#f4f1e6] underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#1c1a17]">
        <Image
          src="/images/concepts/mchale-builders/hero-workbench.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1a17] via-[#1c1a17]/92 to-[#1c1a17]/60" />
        <SpiritLevelMotif className="pointer-events-none absolute top-1/2 right-[-8%] size-[480px] -translate-y-1/2 opacity-80" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center border-2 border-[#a8d94a] text-lg text-[#a8d94a]"
                style={{ fontFamily: "var(--font-mchale-display)" }}
                aria-hidden
              >
                PJM
              </span>
              <span
                className="text-2xl tracking-[0.04em] text-[#f4f1e6] uppercase"
                style={{ fontFamily: "var(--font-mchale-display)" }}
              >
                McHale Builders
              </span>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-[#a8d94a] uppercase">
              Hillend · Dunfermline, Fife
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 max-w-3xl text-5xl leading-[1.02] tracking-tight text-balance uppercase md:text-7xl"
              style={{ fontFamily: "var(--font-mchale-display)" }}
            >
              Twenty-three years, and <span className="text-[#a8d94a]">word of mouth</span> is still doing the
              talking.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-lg text-[#a49c8c]">
              Extensions, joinery, kitchens and bathrooms in Dunfermline — one team, first brick to final coat.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#assistant"
              className="mt-11 inline-flex items-center gap-2 text-sm font-medium text-[#f4f1e6]/80 hover:text-[#f4f1e6]"
            >
              See it in action
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t border-[#3a352c]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 px-6 py-10 text-center">
            <Reveal>
              <p className="text-4xl uppercase md:text-5xl" style={{ fontFamily: "var(--font-mchale-display)" }}>
                <AnimatedNumber value={23} />
              </p>
              <p className="mt-1 text-[11px] text-[#a49c8c] uppercase">Years of completed projects</p>
            </Reveal>
            <Reveal delay={80}>
              <p className="text-4xl uppercase md:text-5xl" style={{ fontFamily: "var(--font-mchale-display)" }}>
                <AnimatedNumber value={6} />
              </p>
              <p className="mt-1 text-[11px] text-[#a49c8c] uppercase">Trades under one roof</p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-4xl uppercase md:text-5xl" style={{ fontFamily: "var(--font-mchale-display)" }}>
                <AnimatedNumber value={1} />
              </p>
              <p className="mt-1 text-[11px] text-[#a49c8c] uppercase">Team, first brick to final coat</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#a8d94a] uppercase">What we build</p>
          <h2
            className="mt-3 text-2xl tracking-tight uppercase md:text-3xl"
            style={{ fontFamily: "var(--font-mchale-display)" }}
          >
            One call covers the whole job.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#3a352c] bg-[#221e17]">
            {SERVICES.map((s, i) => (
              <div
                key={s.name}
                className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${i > 0 ? "border-t border-[#3a352c]" : ""}`}
              >
                <span className="font-medium">{s.name}</span>
                {s.body && <span className="text-sm text-[#a49c8c] sm:text-right">{s.body}</span>}
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#3a352c] bg-[#221e17] px-3 py-1.5 text-xs text-[#a49c8c]"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Testimonial moment — no quotable review exists on any public
          directory, so this states that honestly rather than inventing a
          quote. */}
      <section className="relative overflow-hidden bg-[#a8d94a] px-6 py-24 text-[#1c1a17]">
        <Reveal>
          <p
            className="mx-auto max-w-2xl text-center text-2xl leading-tight font-semibold text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-mchale-display)" }}
          >
            No reviews on a directory anywhere — twenty-three years of work has always travelled by word of mouth
            instead.
          </p>
          <p className="mt-6 text-center text-sm font-medium tracking-wide uppercase opacity-70">
            Checked across public review platforms
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section id="assistant" className="bg-[#1c1a17] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#a8d94a] uppercase">Live demo</p>
            <h2
              className="mt-3 text-3xl tracking-tight uppercase md:text-4xl"
              style={{ fontFamily: "var(--font-mchale-display)" }}
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
          <p className="text-xs font-semibold tracking-[0.2em] text-[#a8d94a] uppercase">Right now</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CHIPS.map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <div className="h-full rounded-xl border border-[#3a352c] bg-[#221e17] p-6">
                <p className="text-3xl" style={{ fontFamily: "var(--font-mchale-display)" }}>
                  {c.stat}
                </p>
                <p className="mt-2 text-sm text-[#a49c8c]">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8a8074]">
            <ShieldCheck className="size-3.5 text-[#a8d94a]" />
            AI Business Analytics teaser — quote conversion, job profitability, callout response — illustrative, not
            McHale&apos;s real figures.
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="border-t border-[#3a352c] bg-[#1c1a17] px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-3xl tracking-tight text-balance uppercase md:text-4xl"
            style={{ fontFamily: "var(--font-mchale-display)" }}
          >
            Word of mouth got you this far. A website that loads could take you further.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm text-[#a8d94a] underline underline-offset-4 hover:text-[#bce56a]"
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#141210] px-6 pb-10 pt-8 text-center text-[11px] text-[#8a8074]">
        PJ McHale Joiners &amp; Builders · 6 North Scotsmill Place, Hillend, Dunfermline, KY11 9GN · 01383 666039
        <br />
        Built from publicly available information only — not affiliated with or published by PJ McHale Joiners &amp;
        Builders.
      </footer>
    </div>
  );
}
