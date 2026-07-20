import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies-data";

function BrowserChrome() {
  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-3 py-2">
      <span className="size-2.5 rounded-full bg-destructive/50" />
      <span className="size-2.5 rounded-full bg-accent/50" />
      <span className="size-2.5 rounded-full bg-emerald-500/50" />
    </div>
  );
}

export function WebsiteShowcase({ study }: { study: CaseStudy }) {
  return (
    <section className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Website showcase
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              This isn&apos;t a static mock-up — it&apos;s the real, working
              site. Scroll and click around inside the previews below.
            </p>
          </div>
          <Link
            href={study.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Open full site <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Desktop frame */}
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <BrowserChrome />
            <div className="h-[420px] w-full bg-background">
              <iframe
                src={study.demoUrl}
                title={`${study.name} desktop preview`}
                className="h-full w-full"
                loading="lazy"
              />
            </div>
          </div>

          {/* Mobile frame */}
          <div className="mx-auto w-[260px] overflow-hidden rounded-[2rem] border-[6px] border-foreground/80 bg-background shadow-sm">
            <div className="h-[480px] w-full bg-background">
              <iframe
                src={study.demoUrl}
                title={`${study.name} mobile preview`}
                className="h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <p className="font-mono text-xs font-medium tracking-wide text-foreground uppercase">
            Key pages in this project
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {study.showcasePages.map((p) => (
              <span
                key={p}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
