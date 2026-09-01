// Roadmap item #9 ("close draft-email -> booked-call loop"). Re-grounded
// against the real codebase before building this: the roadmap's own
// framing ("calendar sync already exists internally") turned out not to
// hold for tenant orgs — tenant-graph-auth.ts's Microsoft Graph
// connection only ever requests Mail.Read (its own comment: "no write
// scopes a tenant's consent screen has no business asking for"), and
// calendar-sync.ts is HamishAI's own internal Google Calendar task
// reminders, not a tenant-facing booking capability. Real per-tenant
// calendar availability/booking (OAuth re-consent for a write scope, slot
// computation, a booking UI) is a materially bigger build than this
// roadmap item implied.
//
// What's actually buildable now, and still closes the real loop the item
// describes: a tenant pastes their own existing external booking link
// (Calendly, cal.com, etc.) — the exact same "paste one URL" pattern the
// marketing site's own /book page already uses via CALENDLY_URL — and it
// gets appended to AI-drafted outreach so a reply converts straight to a
// booked call instead of another round of email.
//
// Deliberately no relative-path branch (unlike command-centre-layout.ts's
// isSafeHref, which allows an in-app "/studio/..." href) — a booking link
// is always someone else's external scheduling tool, never a page on this
// site.
export function isSafeBookingLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return false;
  return /^https:\/\/[^\s]+$/i.test(value);
}

// Deterministic append, not folded into the AI-drafted body itself — same
// "never let a critical fact depend on the model remembering to include
// it verbatim" reasoning as every other fixed-template line in this
// codebase (send-invoice-reminder.ts's payment link, trial-reminders.ts's
// billing link). Applied at read/send time, not at sales-kit generation
// time, so it also covers every sales kit generated before an org ever
// set a booking link — no regeneration needed.
export function appendBookingLink(body: string, bookingLink: string | null): string {
  if (!bookingLink || !isSafeBookingLink(bookingLink)) return body;
  return `${body}\n\nPick a time that works for you: ${bookingLink}`;
}
