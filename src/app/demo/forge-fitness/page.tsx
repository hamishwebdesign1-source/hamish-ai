import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forge Fitness Studio | Bruntsfield, Edinburgh",
  description:
    "Concept redesign for a fictional Edinburgh fitness studio — demonstrating an AI class-recommendation chat and automated waitlist fill.",
};

const timetable = [
  { day: "Mon", classes: ["6:30am HIIT", "12:15pm Strength", "6:00pm Boxing"] },
  { day: "Wed", classes: ["6:30am Strength", "12:15pm HIIT", "6:00pm Spin"] },
  { day: "Fri", classes: ["6:30am Boxing", "12:15pm Spin", "6:00pm HIIT"] },
];

export default function ForgeFitnessDemo() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <header className="sticky top-8 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-black tracking-tight uppercase">
            Forge <span className="text-[#d4ff00]">Fitness</span>
          </span>
          <nav className="hidden gap-8 text-sm font-medium text-white/60 md:flex">
            <a href="#timetable" className="hover:text-white">Timetable</a>
            <a href="#chat" className="hover:text-white">Ask us</a>
            <a href="#join" className="hover:text-white">Membership</a>
          </nav>
          <a
            href="#join"
            className="rounded-full bg-[#d4ff00] px-4 py-2 text-sm font-bold text-black hover:bg-[#c2e900]"
          >
            Join now
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <p className="text-sm font-bold tracking-[0.3em] text-[#d4ff00] uppercase">
          Bruntsfield · Edinburgh
        </p>
        <h1 className="mt-4 max-w-2xl text-5xl font-black tracking-tight text-balance uppercase md:text-7xl">
          Train hard.
          <br />
          Book easy.
        </h1>
        <p className="mt-6 max-w-md text-lg text-white/60">
          HIIT, strength, boxing, and spin classes in the heart of
          Bruntsfield — book in seconds, never lose a spot.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#timetable"
            className="rounded-full bg-[#d4ff00] px-6 py-3 text-sm font-bold text-black hover:bg-[#c2e900]"
          >
            See timetable
          </a>
          <a
            href="#join"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white hover:border-white/40"
          >
            First class free
          </a>
        </div>
      </section>

      {/* Timetable */}
      <section id="timetable" className="border-t border-white/10 bg-white/5">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black tracking-tight uppercase">This week</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {timetable.map((d) => (
              <div key={d.day} className="rounded-lg border border-white/10 bg-black p-5">
                <p className="text-sm font-bold tracking-widest text-[#d4ff00] uppercase">
                  {d.day}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/80">
                  {d.classes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI class recommendation demo */}
      <section id="chat" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-3xl font-black tracking-tight uppercase">
          Not sure where to start?
        </h2>
        <p className="mt-3 max-w-lg text-white/60">
          The AI assistant on the live site recommends the right class for
          new members, and automatically fills cancelled spots by texting
          the waitlist — instead of losing that revenue.
        </p>

        <div className="mt-8 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 text-sm">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#d4ff00] px-4 py-2 text-black">
              I&apos;m a total beginner, what should I try first?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-white">
              Start with Strength on Monday at 12:15pm — smaller class,
              coach-led pace, great for building confidence with the
              equipment. Want me to book you in?
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#d4ff00] px-4 py-2 text-black">
              Yes please — and can you text me if a spot opens up earlier?
            </div>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-white">
              Done — you&apos;re on the waitlist for the 6:30am slot too.
              We&apos;ll text you the moment someone cancels.
            </div>
          </div>
        </div>
      </section>

      {/* Membership CTA */}
      <section id="join" className="border-t border-white/10 bg-[#d4ff00] text-black">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase">
              First class, on us.
            </h2>
            <p className="mt-2 text-black/70">
              No contract, no pressure — just come train.
            </p>
          </div>
          <span className="rounded-full bg-black px-6 py-3 text-sm font-bold text-[#d4ff00]">
            Booking widget goes here
          </span>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-white/40">
        24 Bruntsfield Place, Edinburgh EH10 · Mon–Sun, 6am–9pm ·
        hello@forgefitness.example
      </footer>
    </div>
  );
}
