import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Craigie & Sons Joinery | Portobello, Edinburgh",
  description:
    "Concept redesign for a fictional Edinburgh joinery business — demonstrating AI-assisted quote triage and a trust-first layout.",
};

const services = [
  "Kitchen fitting",
  "Staircases & flooring",
  "Fitted wardrobes",
  "Doors & windows",
  "Decking & garden joinery",
  "Repairs & callouts",
];

const trust = [
  { stat: "27", label: "years trading" },
  { stat: "600+", label: "jobs completed" },
  { stat: "Fully", label: "insured & certified" },
];

export default function CraigieAndSonsDemo() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Nav */}
      <header className="sticky top-8 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-bold tracking-tight">
            Craigie &amp; Sons <span className="text-emerald-800">Joinery</span>
          </span>
          <nav className="hidden gap-8 text-sm font-medium text-stone-600 md:flex">
            <a href="#services" className="hover:text-stone-900">Services</a>
            <a href="#work" className="hover:text-stone-900">Our Work</a>
            <a href="#quote" className="hover:text-stone-900">Get a Quote</a>
          </nav>
          <a
            href="tel:+441310000001"
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
          >
            Call now
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="text-sm font-semibold tracking-wide text-orange-600 uppercase">
          Portobello · Edinburgh &amp; the Lothians
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
          Joinery done properly, first time.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-stone-600">
          Kitchens, staircases, and fitted joinery for Edinburgh homes — built
          by tradesmen who answer the phone.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#quote"
            className="rounded-md bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Get a free quote
          </a>
          <a
            href="#work"
            className="rounded-md border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-800 hover:border-stone-400"
          >
            See our work
          </a>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-6 border-t border-stone-200 pt-8">
          {trust.map((t) => (
            <div key={t.label}>
              <p className="text-2xl font-bold text-emerald-800 md:text-3xl">{t.stat}</p>
              <p className="text-xs text-stone-500 md:text-sm">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">What we do</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {services.map((s) => (
              <div key={s} className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-4 font-medium">
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/after gallery */}
      <section id="work" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Recent projects</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            { title: "Trinity kitchen refit", tag: "Kitchen fitting", image: "/images/case-studies/craigie-kitchen.jpg" },
            { title: "Morningside staircase rebuild", tag: "Staircases", image: "/images/case-studies/craigie-staircase.jpg" },
            { title: "Corstorphine fitted wardrobes", tag: "Wardrobes", image: "/images/case-studies/craigie-wardrobe.jpg" },
            { title: "Joppa decking & garden store", tag: "Garden joinery", image: "/images/case-studies/craigie-decking.jpg" },
          ].map((p) => (
            <div key={p.title} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
              <div className="relative h-40 w-full">
                <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 480px, 100vw" className="object-cover" />
              </div>
              <div className="p-4">
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-stone-500">{p.tag}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI-assisted quote form */}
      <section id="quote" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Get a quote — works from the job site too
          </h2>
          <p className="mt-3 text-stone-600">
            Send a photo and a few details. Enquiries are automatically sorted
            by job type and urgency, so urgent callouts get a reply first.
          </p>

          <div className="mt-8 rounded-lg border border-stone-200 bg-stone-50 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500 sm:col-span-2">
                📷 Upload a photo of the job
              </div>
              <div className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-500">
                Job type: Kitchen fitting
              </div>
              <div className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-500">
                Urgency: Within 2 weeks
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-md bg-emerald-800/5 p-3 text-sm text-emerald-900">
              <span>✓</span>
              <span>
                Automatically routed as: <strong>Kitchen fitting, standard priority</strong> —
                confirmation sent instantly, quote follow-up within 24 hours.
              </span>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-md bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 sm:w-auto"
            >
              Send quote request
            </button>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-stone-500">
        Craigie &amp; Sons Joinery · Portobello, Edinburgh · Serving Edinburgh &amp; the Lothians ·
        hello@craigieandsons.example
      </footer>
    </div>
  );
}
