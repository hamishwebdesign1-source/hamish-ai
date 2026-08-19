import { Eyebrow } from "@/components/eyebrow";

// No node-and-line backdrop here (dropped — see redesign notes, 19 Aug
// 2026, same call as the homepage hero in the same pass): a "connected
// dots" motif is about the single most recognisable AI-startup visual
// cliché there is, and every page using this component was carrying it.
// The heading and generous padding below carry the hero on their own now.
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  visual,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className={visual ? "grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16" : ""}>
          <div>
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
          {visual && <div className="relative">{visual}</div>}
        </div>
      </div>
    </section>
  );
}
