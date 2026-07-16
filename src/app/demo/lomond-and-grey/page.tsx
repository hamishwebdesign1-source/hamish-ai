import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lomond & Grey Accountants | New Town, Edinburgh",
  description:
    "Concept redesign for a fictional Edinburgh accountancy practice — demonstrating an AI FAQ assistant and lead-qualification routing.",
};

const services = [
  {
    title: "Sole traders",
    body: "Self-assessment, bookkeeping, and straightforward advice — no jargon, no surprises at tax time.",
  },
  {
    title: "Limited companies",
    body: "Annual accounts, corporation tax, payroll, and director support for growing Edinburgh businesses.",
  },
  {
    title: "Personal tax",
    body: "Tax returns, capital gains, and planning for individuals with more complex affairs.",
  },
];

export default function LomondAndGreyDemo() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-8 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span
            className="text-lg font-semibold tracking-tight text-slate-900"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Lomond &amp; Grey
          </span>
          <nav className="hidden gap-8 text-sm text-slate-500 md:flex">
            <a href="#services" className="hover:text-slate-900">Services</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
            <a href="#quote" className="hover:text-slate-900">Get in touch</a>
          </nav>
          <a
            href="tel:+441310000002"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Book a call
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">
          New Town · Edinburgh
        </p>
        <h1
          className="mt-4 max-w-2xl text-4xl font-medium tracking-tight text-balance md:text-5xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Straightforward accountancy, properly explained.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-slate-600">
          For sole traders, limited companies, and individuals who want a
          straight answer, not a lecture.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#quote"
            className="rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Get in touch
          </a>
          <a
            href="#services"
            className="rounded-md border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            See our services
          </a>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2
            className="text-2xl font-medium tracking-tight md:text-3xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Who we help
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="font-medium text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI FAQ demo */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2
          className="text-2xl font-medium tracking-tight md:text-3xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Answers, even outside office hours
        </h2>
        <p className="mt-3 max-w-lg text-slate-600">
          The AI assistant on the live site answers common tax-deadline
          questions instantly, so clients aren&apos;t waiting on an email
          reply the night before a deadline.
        </p>

        <div className="mt-8 max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 text-sm">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2 text-white">
              When&apos;s the deadline for my self-assessment this year?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-slate-900">
              Online returns are due 31 January, with payment due the same
              day. Want a reminder set closer to the date, or should I flag
              this to the team to review your return early?
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2 text-white">
              Please flag it — I run a limited company too, is that different?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-slate-900">
              Yes — your company&apos;s corporation tax and accounts deadlines
              run separately, based on your year end. I&apos;ve noted you as a
              limited company client so the team can confirm your specific
              dates.
            </div>
          </div>
        </div>
      </section>

      {/* Lead qualification demo */}
      <section id="quote" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2
            className="text-2xl font-medium tracking-tight md:text-3xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Get in touch
          </h2>
          <p className="mt-3 text-slate-600">
            Enquiries are automatically routed to the right person, so
            individuals and businesses get relevant answers, not a generic
            reply.
          </p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-500">
                I am: Limited company director
              </div>
              <div className="rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-500">
                Enquiry: Annual accounts
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-md bg-slate-900/5 p-3 text-sm text-slate-700">
              <span>✓</span>
              <span>
                Routed to: <strong>Business accounts team</strong> — a
                response is prioritised within 1 working day.
              </span>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              Send enquiry
            </button>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-slate-500">
        Lomond &amp; Grey Accountants · 22 Queen Street, New Town, Edinburgh
        EH2 · hello@lomondandgrey.example
      </footer>
    </div>
  );
}
