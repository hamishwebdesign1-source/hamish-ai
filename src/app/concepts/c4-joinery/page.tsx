"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Star,
  ShieldCheck,
  Sparkles,
  Send,
  Hammer,
  DoorClosed,
  Bath,
  Fence,
  Sofa,
  LayoutGrid,
  Wrench,
  TrendingUp,
  Clock,
  MessageSquareText,
} from "lucide-react";

const SERVICES = [
  { icon: Sofa, label: "Bespoke furniture & fitted wardrobes" },
  { icon: LayoutGrid, label: "Loft conversions & home extensions" },
  { icon: DoorClosed, label: "Door installation & repairs" },
  { icon: Wrench, label: "Kitchen installations" },
  { icon: Hammer, label: "Staircases & balustrades" },
  { icon: Fence, label: "Fencing & decking" },
  { icon: LayoutGrid, label: "Flooring" },
  { icon: Bath, label: "Bathroom refurbishment" },
];

const REPORT_POINTS = [
  {
    title: "The gap: zero web presence of your own",
    body:
      "Every search result for C4 Joinery today points to Facebook, Yell, or Trusted Trader — never a page you control. Anyone comparing joiners on Google has no reason to land on you specifically.",
  },
  {
    title: "Your 5.0★ record isn't working for you yet",
    body:
      "32 reviews, a perfect rating, Trusted Trader status since 2023 — that's a genuinely strong track record, but it's buried on a third-party directory instead of being the first thing a new enquiry sees.",
  },
  {
    title: "Enquiries still depend on someone picking up the phone",
    body:
      "Right now every enquiry needs a call answered live. An AI assistant like the one below can answer the common questions instantly, any time, and only hand you the enquiries that actually need you.",
  },
];

type Message = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi, I'm C4 Joinery's AI assistant — ask me about our services, or what it's like to get a quote.";
const SUGGESTED = ["What services do you offer?", "How do I get a quote?", "Are you insured and reliable?"];

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
    <div className="overflow-hidden rounded-xl border border-zinc-800 shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/50" />
        <span className="size-2.5 rounded-full bg-amber-500/50" />
        <span className="size-2.5 rounded-full bg-emerald-500/50" />
        <span className="ml-2 font-mono text-[10px] tracking-wide text-zinc-400 uppercase">
          C4 Joinery — AI Assistant (concept)
        </span>
      </div>
      <div ref={scrollRef} className="flex h-[380px] flex-col gap-3 overflow-y-auto bg-zinc-950 p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-amber-700 px-3 py-2 text-sm text-white"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-2 text-sm whitespace-pre-line text-zinc-100"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-2.5">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-zinc-400" />
            </span>
            <span className="text-xs text-zinc-400">Typing…</span>
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
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-600 hover:text-zinc-100"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900 p-3"
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
          className="h-9 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:border-amber-600"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-700 text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export default function C4JoineryConcept() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Banner — this is a real prospect, not a fictional portfolio piece */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-zinc-900 px-4 py-2 text-center text-xs text-zinc-300">
        <span>
          Concept built by <span className="font-medium text-white">Hamish AI</span> for{" "}
          <span className="font-medium text-white">C4 Joinery Ltd</span> — not your current site. Built entirely
          from publicly available information.
        </span>
        <Link href="https://hamishai.org" className="font-medium text-white underline underline-offset-2">
          hamishai.org
        </Link>
      </div>

      {/* Nav */}
      <header className="sticky top-8 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-bold tracking-tight">
            C4 <span className="text-amber-700">Joinery</span>
          </span>
          <nav className="hidden gap-8 text-sm font-medium text-stone-600 md:flex">
            <a href="#services" className="hover:text-stone-900">Services</a>
            <a href="#assistant" className="hover:text-stone-900">Ask us anything</a>
            <a href="#insights" className="hover:text-stone-900">For the business</a>
          </nav>
          <a
            href="tel:+447483491710"
            className="flex items-center gap-1.5 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Phone className="size-3.5" />
            Call now
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-10">
          <div>
            <p className="text-sm font-semibold tracking-wide text-amber-700 uppercase">
              Linwood · Paisley &amp; Renfrewshire
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance md:text-6xl">
              Family joinery, done to a 5.0★ standard.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-stone-600">
              From fitted wardrobes to full home extensions — a Renfrewshire Trusted Trader since 2023, rated 5.0
              stars across 32 reviews.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="tel:+447483491710"
                className="rounded-md bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Call 07483 491 710
              </a>
              <a
                href="#assistant"
                className="rounded-md border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-800 hover:border-stone-400"
              >
                Ask our AI assistant
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-5 fill-current" />
              ))}
            </div>
            <p className="mt-3 text-2xl font-bold">5.0 out of 5</p>
            <p className="text-sm text-stone-500">Across 32 customer reviews, Trusted Trader Scotland</p>
            <blockquote className="mt-5 border-l-2 border-amber-600 pl-4 text-stone-700 italic">
              &ldquo;Nothing was ever a hassle or bother.&rdquo;
            </blockquote>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-stone-200 pt-5 text-sm">
              <div className="flex items-center gap-1.5 text-stone-600">
                <ShieldCheck className="size-4 text-amber-700" />
                Trusted Trader since 2023
              </div>
              <div className="flex items-center gap-1.5 text-stone-600">
                <ShieldCheck className="size-4 text-amber-700" />
                Companies House: active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">What we do</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.label} className="rounded-lg border border-stone-200 bg-stone-50 p-5">
                <s.icon className="size-5 text-amber-700" />
                <p className="mt-3 text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI assistant demo */}
      <section id="assistant" className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-amber-700" />
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Your AI assistant, live</h2>
        </div>
        <p className="mt-3 text-stone-600">
          This is a working demo — try asking it something a customer might ask before booking a joiner.
        </p>
        <div className="mt-8">
          <ConceptChat />
        </div>
      </section>

      {/* Analytics teaser */}
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-amber-700" />
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              AI Business Analytics — illustrative example
            </h2>
          </div>
          <p className="mt-3 max-w-2xl text-stone-600">
            For a joinery business, this is the kind of thing we&apos;d build a dashboard around — figures below are
            illustrative, not C4 Joinery&apos;s real data.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: MessageSquareText, label: "Quote-to-job conversion rate" },
              { icon: Hammer, label: "Which job types are most profitable" },
              { icon: Clock, label: "Callout response times" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-stone-200 bg-stone-50 p-5">
                <item.icon className="size-5 text-amber-700" />
                <p className="mt-3 text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report / why this matters */}
      <section id="insights" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Why this matters for C4 Joinery</h2>
        <div className="mt-8 space-y-6">
          {REPORT_POINTS.map((p) => (
            <div key={p.title} className="border-l-2 border-amber-600 pl-5">
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1.5 text-sm text-stone-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 px-6 py-10 text-center text-xs text-stone-500">
        C4 Joinery Ltd · Mossedge Industrial Estate, Moss Road, Linwood, PA3 3HR · 07483 491 710 / 0141 611 9090
        <br />
        Concept page by Hamish AI — built from publicly available information only, not affiliated with or
        published by C4 Joinery Ltd.
      </footer>
    </div>
  );
}
