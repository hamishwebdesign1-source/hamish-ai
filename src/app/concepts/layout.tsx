import type { Metadata } from "next";

// SEO audit (2026-09-02) — verified live: none of the 22 /concepts pages
// had a meta-robots tag (or any layout.tsx at all — this file is new).
// Each concept page is a one-off, personalised outreach tool built for a
// specific real prospect (see prospects.concept_slug's own comment in
// supabase/schema-leads.sql — "a one-off personalised concept page built
// for this lead"), styled to look like that business's own site so a
// cold-outreach email can point to real, working proof rather than a
// generic case study. Being publicly indexable was a real, confirmed
// gap: Google could surface these as if they were the named business's
// actual website, and 22 pages that aren't genuinely "about" HamishAI
// dilute the domain's own topical authority. Same treatment as
// demo/layout.tsx's own fix: noindex, still followable so the pages stay
// reachable/functional for the one real visitor each is actually sent
// to (the prospect who received the link).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ConceptsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
