import { Eyebrow } from "@/components/eyebrow";
import { ConstellationBackdrop } from "@/components/constellation-backdrop";
import { ParallaxLayer } from "@/components/parallax-layer";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-full max-w-2xl opacity-80 lg:block"
        style={{
          maskImage: "linear-gradient(to left, black 35%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to left, black 35%, transparent 88%)",
        }}
      >
        <ParallaxLayer speed={0.08} className="h-full w-full">
          <ConstellationBackdrop className="h-full w-full" />
        </ParallaxLayer>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
