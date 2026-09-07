// Currency-neutral project-value band helpers — split out from
// research-lead.ts (a server-only module: SSL checks via node:tls, the
// Anthropic SDK) so a "use client" component (research-lead-button.tsx,
// research-summary.tsx) can import just this formatting logic without
// pulling research-lead.ts's server-only dependencies into the client
// bundle. Importing formatValueBand directly from research-lead.ts caused
// a real Turbopack build failure ("the chunking context does not support
// external modules (request: node:tls)") — caught by `npm run build`,
// not by tsc or vitest, since neither actually bundles for the browser.
//
// The band itself is a size, not a price in a specific currency — research
// cached before LeadResearch.currency existed stored the £ symbol baked
// into the band string ("£1,500-£3,000"); normalizeValueBand() strips it
// so lookups against VALUE_BAND_SCORE work the same for old and new data,
// no backfill migration needed.
export const VALUE_BAND_SCORE: Record<string, number> = {
  "500-1,500": 1,
  "1,500-3,000": 2,
  "3,000-6,000": 4,
  "6,000+": 5,
};

const CURRENCY_SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

export function normalizeValueBand(band: string): string {
  return band.replace(/[£$€]/g, "");
}

// Display-only: renders a stored band with the right symbol for its
// currency. Legacy research with no `currency` field defaults to GBP —
// correct for that data, since it all predates Studio's per-org search
// (this pipeline only ever ran for Hamish's own Edinburgh-based leads
// until then).
export function formatValueBand(band: string, currency?: string): string {
  const symbol = CURRENCY_SYMBOL[currency ?? "GBP"] ?? "£";
  return normalizeValueBand(band)
    .split("-")
    .map((part) => (part === "" ? part : `${symbol}${part}`))
    .join("-");
}
