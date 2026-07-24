import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "The Gannet | Seafood, Leith",
  description:
    "Concept redesign for a fictional Leith seafood restaurant — demonstrating an AI chat feature and booking-first design.",
};

const menu = [
  { name: "Grilled North Sea Cod", price: "£19", note: "brown shrimp butter, sea greens" },
  { name: "Half Shell Oysters", price: "£14", note: "shallot vinegar, half dozen" },
  { name: "Whole Roasted Sole", price: "£26", note: "brown butter, capers, lemon" },
  { name: "Smoked Haddock Chowder", price: "£11", note: "leeks, potato, chive" },
];

// Updated weekly by the client via email — plain array, no CMS needed for
// a two-item list that changes this infrequently.
const specials = [
  { name: "Roast Hake, Winter Greens", price: "£22", note: "brown shrimp, charred leek, Jerusalem artichoke" },
  { name: "Butternut & Crab Bisque", price: "£12", note: "toasted sourdough, chive oil" },
];

export default function TheGannetDemo() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="sticky top-8 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="font-serif text-xl tracking-widest text-amber-50 uppercase" style={{ fontFamily: "var(--font-fraunces)" }}>
            The Gannet
          </span>
          <nav className="hidden gap-8 text-sm text-zinc-400 md:flex">
            <a href="#menu" className="hover:text-amber-50">Menu</a>
            <a href="#about" className="hover:text-amber-50">Our Story</a>
            <a href="#chat" className="hover:text-amber-50">FAQ</a>
          </nav>
          <a
            href="#book"
            className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300"
          >
            Book a table
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <Image
          src="/images/case-studies/the-gannet-hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(217,119,6,0.25), transparent 55%), linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.92) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-20">
          <p className="text-sm tracking-[0.3em] text-amber-400 uppercase">Leith, Edinburgh</p>
          <h1
            className="mt-4 max-w-2xl text-5xl font-medium tracking-tight text-balance md:text-7xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Seafood, done honestly.
          </h1>
          <p className="mt-6 max-w-md text-lg text-zinc-400">
            Line-caught, day-boat fish from the Forth — cooked simply, served
            without ceremony.
          </p>
          <div className="mt-8 flex gap-4">
            <a
              href="#book"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-medium text-zinc-950 hover:bg-amber-300"
            >
              Book a table
            </a>
            <a
              href="#menu"
              className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-100 hover:border-zinc-500"
            >
              View menu
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p
          className="text-2xl leading-relaxed text-zinc-300 md:text-3xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          &ldquo;We buy what the boats bring in that morning — the menu
          changes because the sea does.&rdquo;
        </p>
        <p className="mt-4 text-sm text-zinc-500">— Owners, The Gannet</p>
      </section>

      {/* Menu */}
      <section id="menu" className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="flex items-center gap-3">
            <h2
              className="text-2xl font-medium tracking-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              This week&apos;s specials
            </h2>
            <span className="rounded-full border border-amber-400/40 px-2.5 py-0.5 text-xs font-medium text-amber-400 uppercase tracking-wide">
              Changes weekly
            </span>
          </div>
          <div className="mt-6 divide-y divide-zinc-800">
            {specials.map((item) => (
              <div key={item.name} className="flex items-baseline justify-between gap-6 py-4">
                <div>
                  <p className="font-medium text-amber-50">{item.name}</p>
                  <p className="text-sm text-zinc-500">{item.note}</p>
                </div>
                <span className="whitespace-nowrap text-amber-400">{item.price}</span>
              </div>
            ))}
          </div>

          <h2
            className="mt-16 text-3xl font-medium tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Tonight&apos;s menu
          </h2>
          <div className="mt-10 divide-y divide-zinc-800">
            {menu.map((item) => (
              <div key={item.name} className="flex items-baseline justify-between gap-6 py-4">
                <div>
                  <p className="font-medium text-zinc-100">{item.name}</p>
                  <p className="text-sm text-zinc-500">{item.note}</p>
                </div>
                <span className="whitespace-nowrap text-amber-400">{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI chat feature demo */}
      <section id="chat" className="mx-auto max-w-3xl px-6 py-24">
        <h2
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Questions answered, even after close.
        </h2>
        <p className="mt-3 max-w-lg text-zinc-400">
          The AI concierge on the live site answers menu, allergen, and
          opening-hours questions instantly — day or night. Here&apos;s what
          that looks like:
        </p>

        <div className="mt-8 max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-col gap-3 text-sm">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400 px-4 py-2 text-zinc-950">
              What&apos;s the special this week?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2 text-zinc-100">
              This week we&apos;ve got roast hake with winter greens, and a
              butternut &amp; crab bisque — both while stocks last. Want me
              to hold you a table to try them?
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400 px-4 py-2 text-zinc-950">
              Do you have anything for someone with a shellfish allergy?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2 text-zinc-100">
              Yes — the grilled cod, smoked haddock chowder, and whole
              roasted sole are all shellfish-free. Just flag it with your
              server on arrival and the kitchen will double check.
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400 px-4 py-2 text-zinc-950">
              Are you open Monday?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2 text-zinc-100">
              We&apos;re closed Mondays — open Tuesday to Sunday, 5pm till
              late. Want me to hold you a table for another night?
            </div>
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section id="book" className="border-t border-zinc-800 bg-amber-400 text-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-medium tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
              Table for two, tonight?
            </h2>
            <p className="mt-2 text-zinc-800">
              Booking online takes 30 seconds — no phone call needed.
            </p>
          </div>
          <div className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-300">
                Tonight, 7:30pm
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-300">
                2 guests
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
              <span>✓</span>
              <span>Table held — confirmation sent instantly.</span>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-full bg-amber-400 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-300"
            >
              Confirm booking
            </button>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-zinc-600">
        14 Shore Place, Leith, Edinburgh EH6 · Tue–Sun, 5pm–late ·
        hello@thegannet.example
      </footer>
    </div>
  );
}
