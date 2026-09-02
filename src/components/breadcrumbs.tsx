import Link from "next/link";
import { ChevronRight } from "lucide-react";

// SEO/GEO audit follow-up (2 Sep 2026) — flagged in SEO_AI_VISIBILITY_
// STRATEGY.md as a real, scoped gap: no page had a visible breadcrumb
// trail, so BreadcrumbList schema was deliberately left out of the
// earlier structured-data pass rather than added with nothing real to
// back it (the audit's own "don't add schema for information that isn't
// actually present" rule). This is the visible UI that earns it — real
// navigation, not a schema-only construct. Renders both the visible
// trail and its matching JSON-LD from the same `items` array, so they
// can never disagree with each other.
export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://hamishai.org${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground uppercase">
        {items.map((item, i) => (
          <span key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
            {item.href ? (
              <Link href={item.href} className="tracking-wide transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="tracking-wide text-foreground">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
