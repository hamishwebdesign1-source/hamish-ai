import { describe, it, expect } from "vitest";
import { isAuthenticatedSender } from "./email-inbox";

// Backlog: "email-inbox.ts's inbound-triage matching is From-header-only —
// no spoofing check." The Gmail search matches purely on the From header;
// isAuthenticatedSender() is the independent authenticity check layered on
// top, using the Authentication-Results header Gmail's own receiving mail
// server appends (already fetched via format:"full", no extra API call).
// Fails closed: anything short of an explicit dkim=pass AND spf=pass,
// written by Gmail's own authserv-id, is treated as unverified.
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

  // Security Auditor re-verification (2026-08-27) of the tradeoff flagged
  // when the SPF+DKIM check shipped: RFC 8601 §5 only obliges a receiving
  // MTA to strip a pre-existing Authentication-Results header claiming its
  // OWN authserv-id. An attacker is free to append their own fabricated
  // header with a different authserv-id in the raw message they send —
  // Gmail has no obligation to remove it, since it isn't impersonating
  // Gmail. A naive "does any header claim a double pass" check would be
  // fooled by this; the fix must only trust the header whose authserv-id
  // is actually Gmail's own.
  it("returns false when an attacker-fabricated Authentication-Results header (wrong authserv-id) claims a pass, even alongside Gmail's own genuine failing verdict", () => {
    const headers = [
      { name: "Subject", value: "Urgent: please wire the deposit today" },
      // Attacker's own forged line, injected into the raw message body they
      // sent — Gmail is not obligated to strip a header impersonating some
      // other server's identity, only one impersonating its own.
      { name: "Authentication-Results", value: "attacker-controlled-host.example; dkim=pass; spf=pass" },
      // Gmail's real, genuine verdict for the actual spoofed message.
      {
        name: "Authentication-Results",
        value:
          "mx.google.com; dkim=fail header.i=@attacker.example; spf=fail smtp.mailfrom=client@example.com",
      },
    ];
    expect(isAuthenticatedSender(headers)).toBe(false);
  });

  it("returns false for an attacker-fabricated header claiming a pass when no genuine mx.google.com header is present at all", () => {
    const headers = [
      { name: "Authentication-Results", value: "some-other-mail-relay.example; dkim=pass; spf=pass" },
    ];
    expect(isAuthenticatedSender(headers)).toBe(false);
  });

  it("still returns true when Gmail's genuine header appears alongside an unrelated forged one making false claims", () => {
    const headers = [
      { name: "Authentication-Results", value: "attacker-controlled-host.example; dkim=pass; spf=pass" },
      {
        name: "Authentication-Results",
        value: "mx.google.com; dkim=pass header.i=@example.com; spf=pass smtp.mailfrom=client@example.com",
      },
    ];
    expect(isAuthenticatedSender(headers)).toBe(true);
  });

  it("is case-insensitive when matching the authserv-id itself", () => {
    const headers = [
      { name: "Authentication-Results", value: "MX.Google.COM; dkim=pass; spf=pass" },
    ];
    expect(isAuthenticatedSender(headers)).toBe(true);
  });
});
