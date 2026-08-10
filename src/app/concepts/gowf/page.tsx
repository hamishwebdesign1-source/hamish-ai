"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Fraunces, Archivo } from "next/font/google";
import { Send, ArrowDown, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";

// Same visual system as docs/lily-golf/visual-identity.html (Phase 4) —
// Fraunces for the wordmark/display, Archivo for everything else. Self-
// hosted via next/font/google rather than the base64 data-URI approach the
// standalone identity artifact used, since this is a real deployed page.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-gowf-display",
});
const body = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gowf-body",
});

// Phase 4 colour system, carried through exactly.
const COLORS = {
  ground: "#F1ECE2",
  groundRaised: "#E9E2D3",
  ink: "#26221C",
  inkSoft: "#5B5548",
  thistle: "#7D6788",
  thistleStrong: "#5E4C68",
  fairway: "#29402F",
  stone: "#A79C8A",
  clay: "#A65A3D",
  line: "rgba(38,34,28,0.14)",
};

const STATS = [
  { value: "37%", label: "of golfers 18 and under were female in 2023 — up from 15% in 2000", source: "Newsweek" },
  { value: "£3.57bn", label: "projected global women's golf apparel market size in 2026", source: "market sizing report" },
  { value: "+14%", label: "year-on-year growth in Scottish female golfers' handicap scores, 2025", source: "Scottish Golf" },
];

const COLLECTION = [
  { name: "The Signature Polo", price: "£58", note: "No chest logo — the wordmark sits small on the cuff.", colour: COLORS.stone },
  { name: "The Fairway Skort", price: "£68", note: "A wrap-front seam, not the standard box-pleat.", colour: COLORS.fairway },
  { name: "The Clubhouse Dress", price: "£85", note: "18th green to dinner, no outfit change.", colour: COLORS.thistle },
  { name: "The Tailored Trouser", price: "£78", note: "Wide-leg, ankle-grazer — not skinny-fit.", colour: COLORS.ink },
  { name: "The Featherweight Quarter-Zip", price: "£92", note: "Feels like cashmere, performs like a base layer.", colour: COLORS.groundRaised },
  { name: "The Sunday Long-Sleeve", price: "£52", note: "UPF50+ — built for a 4-5 hour round in real sun.", colour: COLORS.clay },
];

// A reduced, line-drawn take on the Phase 4 mark — flag on a pin, nothing
// more literal. Used here as ambient background motion, not a literal photo
// standing in for a shoot that hasn't happened (per the Phase 4 photography
// direction notes).
function FlagMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden fill="none">
      <line x1="200" y1="40" x2="200" y2="340" stroke={COLORS.thistle} strokeWidth="1" opacity="0.3" />
      <path d="M200 40 L300 80 L200 118 Z" stroke={COLORS.thistle} strokeWidth="1" opacity="0.3" strokeLinejoin="round" />
      <circle cx="200" cy="340" r="10" stroke={COLORS.thistle} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };
const GREETING = "Hi — I'm Gowf's AI assistant. Ask me about the collection, sizing, or getting started with golf.";
const SUGGESTED = ["What's in the launch collection?", "I'm new to golf — where do I start?", "Why is it called Gowf?"];

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
      const res = await fetch("/api/concepts/gowf/chat", {
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
    <div className="overflow-hidden rounded-xl border shadow-2xl" style={{ borderColor: "#3d3730" }}>
      <div className="flex items-center gap-1.5 border-b px-3 py-2" style={{ borderColor: "#3d3730", background: "#1B1814" }}>
        <span className="size-2.5 rounded-full bg-red-500/40" />
        <span className="size-2.5 rounded-full" style={{ background: `${COLORS.thistle}99` }} />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 text-[10px] font-medium tracking-wide uppercase" style={{ color: "#B7AF9E" }}>
          gowf — ask anything
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[360px] flex-col gap-3 overflow-y-auto p-4" style={{ background: "#24201A" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-line"
            }
            style={
              m.role === "user"
                ? { background: COLORS.thistle, color: "#EDE7DA" }
                : { background: "#332C22", color: "#EDE7DA" }
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm px-3 py-2.5" style={{ background: "#332C22" }}>
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" style={{ background: "#B7AF9E" }} />
              <span className="size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" style={{ background: "#B7AF9E" }} />
              <span className="size-1.5 animate-bounce rounded-full" style={{ background: "#B7AF9E" }} />
            </span>
          </div>
        )}
        {error && (
          <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-red-950 px-3 py-2 text-sm text-red-300">{error}</div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => sendMessage(p)}
                className="rounded-full border px-3 py-1.5 text-xs transition-colors"
                style={{ borderColor: "#3d3730", color: "#B7AF9E" }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: "#3d3730", background: "#1B1814" }}
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
          className="h-9 flex-1 rounded-md border px-3 text-sm outline-none"
          style={{ borderColor: "#3d3730", background: "#24201A", color: "#EDE7DA" }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40"
          style={{ background: COLORS.thistle, color: "#1B1814" }}
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function GowfConcept() {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen`}
      style={{ fontFamily: "var(--font-gowf-body)", background: COLORS.ground, color: COLORS.ink }}
    >
      <div
        className="px-4 py-2 text-center text-[11px]"
        style={{ background: COLORS.ink, color: COLORS.ground }}
      >
        A HamishAI test project — a fictional brand concept built to demonstrate the platform end-to-end. Not a
        real company; nothing here can be purchased.{" "}
        <Link href="https://hamishai.org" className="underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <FlagMotif className="pointer-events-none absolute top-1/2 right-[-6%] size-[480px] -translate-y-1/2" />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: COLORS.thistleStrong }}>
              Working name: Lily Golf
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="mt-6 text-6xl leading-[0.92] font-normal md:text-8xl"
              style={{ fontFamily: "var(--font-gowf-display)", letterSpacing: "-0.03em" }}
            >
              gowf
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p
              className="mx-auto mt-6 max-w-xl text-xl italic md:text-2xl"
              style={{ fontFamily: "var(--font-gowf-display)", color: COLORS.inkSoft }}
            >
              Golf&rsquo;s home turf, reworked for who&rsquo;s arriving now.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <a
              href="#collection"
              className="mt-10 inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: COLORS.inkSoft }}
            >
              See the launch collection
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </Reveal>
        </div>

        <div className="relative border-t" style={{ borderColor: COLORS.line }}>
          <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-6 py-10 text-center">
            {STATS.map((s, i) => (
              <Reveal key={s.value} delay={i * 80}>
                <p className="text-2xl font-semibold tabular-nums md:text-3xl" style={{ fontFamily: "var(--font-gowf-display)" }}>
                  {s.value}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug" style={{ color: COLORS.inkSoft }}>
                  {s.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning statement */}
      <section className="px-6 py-20" style={{ background: COLORS.ink, color: COLORS.ground }}>
        <Reveal>
          <blockquote
            className="mx-auto max-w-2xl text-center text-2xl leading-snug font-normal text-balance italic md:text-4xl"
            style={{ fontFamily: "var(--font-gowf-display)" }}
          >
            &ldquo;A golf brand for women who didn&rsquo;t grow up playing golf &mdash; clothing built to move from
            the first tee to the first round of drinks after.&rdquo;
          </blockquote>
        </Reveal>
      </section>

      {/* Collection preview */}
      <section id="collection" className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: COLORS.thistleStrong }}>
            Launch collection · 6 of 13 pieces
          </p>
          <h2 className="mt-3 text-3xl font-normal md:text-4xl" style={{ fontFamily: "var(--font-gowf-display)" }}>
            Built for the course. Worn everywhere else.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTION.map((item, i) => (
            <Reveal key={item.name} delay={i * 60}>
              <div className="h-full overflow-hidden rounded-xl border" style={{ borderColor: COLORS.line }}>
                <div className="flex h-28 items-end p-4" style={{ background: item.colour }}>
                  <Sparkles
                    className="size-4"
                    style={{ color: item.colour === COLORS.groundRaised ? COLORS.ink : COLORS.ground, opacity: 0.7 }}
                  />
                </div>
                <div className="p-5" style={{ background: COLORS.groundRaised }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-medium" style={{ fontFamily: "var(--font-gowf-display)" }}>
                      {item.name}
                    </p>
                    <p className="shrink-0 text-sm tabular-nums" style={{ color: COLORS.inkSoft }}>
                      {item.price}
                    </p>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>
                    {item.note}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="mt-6 text-xs" style={{ color: COLORS.inkSoft }}>
            Colour blocks, not product photography — no shoot has happened yet for a brand that doesn&rsquo;t exist.
            Full 13-piece collection and reasoning documented in the HamishAI test project plan.
          </p>
        </Reveal>
      </section>

      {/* AI assistant */}
      <section className="px-6 py-24" style={{ background: "#1B1814" }}>
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: COLORS.thistle }}>
              Live demo
            </p>
            <h2 className="mt-3 text-3xl font-normal md:text-4xl" style={{ fontFamily: "var(--font-gowf-display)", color: "#EDE7DA" }}>
              An AI assistant, from day one.
            </h2>
            <p className="mt-3 text-sm" style={{ color: "#B7AF9E" }}>
              Not a bolted-on chatbot — grounded only in Gowf&rsquo;s actual documented brand strategy and launch
              collection. Ask it something.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8">
              <ConceptChat />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing */}
      <section className="px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto max-w-xl text-2xl font-normal text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-gowf-display)" }}
          >
            This is what an idea looks like after HamishAI has been through it — research, strategy, product,
            identity, and a working AI layer, before a single penny is spent.
          </p>
          <Link
            href="https://hamishai.org"
            className="mt-8 inline-block text-sm underline underline-offset-4"
            style={{ color: COLORS.thistleStrong }}
          >
            hamishai.org
          </Link>
        </Reveal>
      </section>

      <footer className="px-6 pt-8 pb-10 text-center text-[11px]" style={{ background: COLORS.groundRaised, color: COLORS.inkSoft }}>
        Gowf (working name: Lily Golf) is a fictional brand created as a HamishAI test project — not a real
        company, not seeking investment, not affiliated with any real business of a similar name.
        <br />
        Research, brand strategy, product collection, and visual identity documented in full at
        docs/lily-golf-test-project.md.
      </footer>
    </div>
  );
}
