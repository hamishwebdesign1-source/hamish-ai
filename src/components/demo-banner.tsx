import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-zinc-900 px-4 py-2 text-center text-xs text-zinc-300">
      <span>
        Concept design by{" "}
        <span className="font-medium text-white">Hamish AI</span> —
        not a real business.
      </span>
      <Link href="/portfolio" className="font-medium text-white underline underline-offset-2">
        ← Back to portfolio
      </Link>
    </div>
  );
}
