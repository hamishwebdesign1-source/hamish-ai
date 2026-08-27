import { describe, it, expect } from "vitest";
import { isAuthenticatedSender } from "./email-inbox";

// Backlog: "email-inbox.ts's inbound-triage matching is From-header-only —
// no spoofing check." The Gmail search matches purely on the From header;
// isAuthenticatedSender() is the independent authenticity check layered on
// top, using the Authentication-Results header Gmail's own receiving mail
// server appends (already fetched via format:"full", no extra API call).
// Fails closed: anything short of an explicit dkim=pass AND spf=pass is
// treated as unverified.
describe("isAuthenticatedSender", () => {
  it("returns true for a genuine message with a real Authentication-Results SPF+DKIM pass", () => {
    const headers = [
      { name: "Subject", value: "A real client email" },
      {
        name: "Authentication-Results",
        value:
          "mx.google.com; dkim=pass header.i=@example.com header.s=google header.b=abc123; spf=pass (google.com: domain of client@example.com designates 1.2.3.4 as permitted sender) smtp.mailfrom=client@example.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=example.com",
      },
    ];
    expect(isAuthenticatedSender(headers)).toBe(true);
  });

  // The exact spoofing scenario the backlog item describes: a From header
  // claiming to be the real client, but the receiving server's own SPF/DKIM
  // checks failed — this must never be treated as genuine.
  it("returns false when the From header matches but SPF/DKIM both fail (a spoofed message)", () => {
    const headers = [
      { name: "Subject", value: "Urgent: please action this" },
      {
        name: "Authentication-Results",
        value:
          "mx.google.com; dkim=fail header.i=@attacker.example header.s=x header.b=xyz; spf=fail (google.com: domain of client@example.com does not designate 9.9.9.9 as permitted sender) smtp.mailfrom=client@example.com",
      },
    ];
    expect(isAuthenticatedSender(headers)).toBe(false);
  });

  it("returns false when only one of dkim/spf passes — both are required", () => {
    const dkimOnly = [
      { name: "Authentication-Results", value: "mx.google.com; dkim=pass header.i=@example.com; spf=fail smtp.mailfrom=client@example.com" },
    ];
    const spfOnly = [
      { name: "Authentication-Results", value: "mx.google.com; dkim=fail header.i=@example.com; spf=pass smtp.mailfrom=client@example.com" },
    ];
    expect(isAuthenticatedSender(dkimOnly)).toBe(false);
    expect(isAuthenticatedSender(spfOnly)).toBe(false);
  });

  it("fails closed (returns false) when the Authentication-Results header is entirely absent", () => {
    const headers = [
      { name: "Subject", value: "No auth header at all" },
      { name: "From", value: "client@example.com" },
    ];
    expect(isAuthenticatedSender(headers)).toBe(false);
  });

  it("fails closed when headers themselves are null/undefined", () => {
    expect(isAuthenticatedSender(null)).toBe(false);
    expect(isAuthenticatedSender(undefined)).toBe(false);
  });

  it("fails closed on an ambiguous/malformed Authentication-Results value (e.g. 'neutral' or 'none', not an explicit pass)", () => {
    const headers = [{ name: "Authentication-Results", value: "mx.google.com; dkim=neutral; spf=none" }];
    expect(isAuthenticatedSender(headers)).toBe(false);
  });

  it("is case-insensitive on the header name (Gmail/some relays may vary casing)", () => {
    const headers = [
      { name: "authentication-results", value: "mx.google.com; dkim=pass header.i=@example.com; spf=pass smtp.mailfrom=client@example.com" },
    ];
    expect(isAuthenticatedSender(headers)).toBe(true);
  });
});
