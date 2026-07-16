import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "The Assembly Rooms | Boutique Hotel, New Town",
  description:
    "Concept redesign for a fictional New Town boutique hotel — demonstrating direct-booking savings and an AI concierge feature.",
};

const rooms = [
  { name: "Classic Georgian", price: "£145", note: "Queen bed, sash windows, courtyard view", image: "/images/case-studies/assembly-classic-room.jpg" },
  { name: "Deluxe Terrace", price: "£195", note: "King bed, private terrace", image: "/images/case-studies/assembly-deluxe-terrace.jpg" },
  { name: "The Assembly Suite", price: "£265", note: "Separate lounge, New Town view", image: "/images/case-studies/assembly-suite.jpg" },
];

export default function AssemblyRoomsDemo() {
  return (
    <div className="min-h-screen bg-[#faf6ef] text-[#2b241c]">
      {/* Nav */}
      <header className="sticky top-8 z-40 border-b border-[#e4dac7] bg-[#faf6ef]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span
            className="text-lg tracking-[0.15em] uppercase"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            The Assembly Rooms
          </span>
          <nav className="hidden gap-8 text-sm text-[#6b5f4d] md:flex">
            <a href="#rooms" className="hover:text-[#2b241c]">Rooms</a>
            <a href="#concierge" className="hover:text-[#2b241c]">Concierge</a>
            <a href="#guide" className="hover:text-[#2b241c]">Local Guide</a>
          </nav>
          <a
            href="#book"
            className="rounded-sm bg-[#5c1f2b] px-4 py-2 text-sm font-medium text-[#faf6ef] hover:bg-[#4a1922]"
          >
            Book direct
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, rgba(92,31,43,0.08), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <p className="text-sm tracking-[0.3em] text-[#5c1f2b] uppercase">
            New Town, Edinburgh
          </p>
          <h1
            className="mx-auto mt-4 max-w-2xl text-4xl tracking-tight text-balance md:text-6xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            A quiet corner of the New Town.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-[#6b5f4d]">
            Georgian townhouse rooms, five minutes from Princes Street.
          </p>
          <a
            href="#book"
            className="mt-8 inline-block rounded-sm bg-[#5c1f2b] px-8 py-3 text-sm font-medium text-[#faf6ef] hover:bg-[#4a1922]"
          >
            Check availability
          </a>
        </div>
      </section>

      {/* Direct booking value prop */}
      <section className="border-t border-[#e4dac7] bg-[#5c1f2b] text-[#faf6ef]">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center">
          <p className="text-sm md:text-base">
            Book direct and save up to <strong>18%</strong> versus third-party
            booking sites — plus a complimentary breakfast.
          </p>
        </div>
      </section>

      {/* Rooms */}
      <section id="rooms" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          Rooms
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.name} className="overflow-hidden rounded-sm border border-[#e4dac7] bg-white">
              <div className="relative h-40 w-full">
                <Image src={r.image} alt={r.name} fill sizes="(min-width: 768px) 400px, 100vw" className="object-cover" />
              </div>
              <div className="p-5">
                <p className="text-lg" style={{ fontFamily: "var(--font-fraunces)" }}>{r.name}</p>
                <p className="mt-1 text-sm text-[#6b5f4d]">{r.note}</p>
                <p className="mt-3 font-medium text-[#5c1f2b]">{r.price} / night</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI concierge demo */}
      <section id="concierge" className="border-t border-[#e4dac7] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
            Your concierge, any hour
          </h2>
          <p className="mt-3 max-w-lg text-[#6b5f4d]">
            The AI concierge on the live site handles room questions and
            local recommendations instantly, and prompts guests toward
            upsells like late checkout.
          </p>

          <div className="mt-8 max-w-sm rounded-lg border border-[#e4dac7] bg-[#faf6ef] p-4">
            <div className="flex flex-col gap-3 text-sm">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#5c1f2b] px-4 py-2 text-[#faf6ef]">
                Anywhere good for dinner nearby that&apos;s not touristy?
              </div>
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-[#2b241c]">
                Try Café St Honoré, five minutes&apos; walk — small, French,
                locals&apos; favourite. Want me to note it for the concierge
                desk to book?
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#5c1f2b] px-4 py-2 text-[#faf6ef]">
                Can I get a late checkout on Sunday?
              </div>
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-[#2b241c]">
                1pm checkout is available for £15, or free if you add
                breakfast for two — shall I add it to your booking?
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section id="book" className="border-t border-[#e4dac7] px-6 py-16 text-center">
        <h2 className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          Check availability
        </h2>
        <p className="mt-2 text-[#6b5f4d]">Best rate, guaranteed, when you book direct.</p>
        <span className="mt-6 inline-block rounded-sm bg-[#2b241c] px-6 py-3 text-sm font-medium text-[#faf6ef]">
          Booking widget goes here
        </span>
      </section>

      <footer id="guide" className="px-6 py-10 text-center text-xs text-[#8a7c66]">
        12 Queen Street, New Town, Edinburgh EH2 · reservations@assemblyrooms.example
      </footer>
    </div>
  );
}
