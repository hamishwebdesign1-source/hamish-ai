import type { Metadata } from "next";
import { WebsiteAuditForm } from "@/components/website-audit-form";
import { Eyebrow } from "@/components/eyebrow";

export const metadata: Metadata = {
  title: "Free Website Health Check | Hamish AI",
  description:
    "A free, honest breakdown of how your website is doing — real technical checks plus specific, plain-English findings. No charge, no obligation.",
};

const trustPoints = ["Free, no obligation", "Real checks, not a generic score", "Results in under a minute"];

export default function WebsiteAuditPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 md:pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow className="mb-6">Free website health check</Eyebrow>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          How&apos;s your website actually doing?
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Real technical checks (SSL, mobile-friendliness, load speed) plus a plain-English AI review of what&apos;s
          working, what isn&apos;t, and where AI could specifically help your business — free, in under a minute.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {trustPoints.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="text-accent">✓</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-xl rounded-lg border border-border bg-background p-6 md:p-8">
        <WebsiteAuditForm />
      </div>
    </section>
  );
}
