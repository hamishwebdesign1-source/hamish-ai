import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChatDemo } from "@/components/chat-demo";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { aiSolutions } from "@/lib/ai-solutions-data";

export const metadata: Metadata = {
  title: "AI Solutions | Hamish AI",
  description:
    "Six practical AI solutions for Edinburgh businesses — customer assistants, receptionists, sales assistants, knowledge bases, content automation, and analytics.",
};

export default function AISolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="AI Solutions"
        title="Practical AI, not hype."
        description="Six things AI can genuinely do for a small business today — with a real example of each conversation, so you can picture it running in yours."
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="flex flex-wrap gap-2">
          {aiSolutions.map((s) => (
            <a
              key={s.slug}
              href={`#${s.slug}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-foreground"
            >
              {s.name}
            </a>
          ))}
        </div>

        <div className="mt-10 flex flex-col">
          {aiSolutions.map((s, i) => (
            <Reveal key={s.slug}>
            <div
              id={s.slug}
              className={`scroll-mt-24 grid gap-8 md:grid-cols-2 md:items-start ${
                i === 0 ? "" : "mt-16 border-t border-border/60 pt-16"
              }`}
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <p className="font-mono text-xs font-medium tracking-wide text-accent uppercase">
                  {s.audience}
                </p>
                <h2 className="mt-2 font-heading text-2xl font-semibold md:text-3xl">
                  {s.name}
                </h2>
                <p className="mt-3 text-muted-foreground">{s.description}</p>

                <Separator className="my-5" />

                <ul className="space-y-2 text-sm">
                  {s.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-sm font-medium text-foreground">
                  {s.callout}
                </p>
              </div>

              <div className={`flex flex-col gap-5 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-primary">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <ChatDemo messages={s.demo} />
              </div>
            </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <h2 className="font-heading text-2xl font-semibold md:text-3xl">
              Want to see this on your own website?
            </h2>
            <p className="mt-2 text-primary-foreground/70">
              We&apos;ll show you exactly which of these would make the
              biggest difference for your business, free.
            </p>
          </div>
          <Button size="lg" variant="secondary" render={<Link href="/book" />}>
            Book a free AI consultation
          </Button>
        </div>
      </section>
    </>
  );
}
