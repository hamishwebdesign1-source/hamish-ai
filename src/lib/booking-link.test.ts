import { describe, it, expect } from "vitest";
import { isSafeBookingLink, appendBookingLink } from "./booking-link";

describe("isSafeBookingLink", () => {
  it("accepts a real https:// URL", () => {
    expect(isSafeBookingLink("https://calendly.com/hamish/intro")).toBe(true);
  });

  it("rejects an unsafe or malformed scheme", () => {
    expect(isSafeBookingLink("javascript:alert(1)")).toBe(false);
    expect(isSafeBookingLink("http://calendly.com/hamish")).toBe(false);
    expect(isSafeBookingLink("data:text/html,x")).toBe(false);
  });

  it("rejects a relative path — a booking link is always someone else's external tool", () => {
    expect(isSafeBookingLink("/studio/settings")).toBe(false);
  });

  it("rejects non-string, empty, and overlong input", () => {
    expect(isSafeBookingLink(undefined)).toBe(false);
    expect(isSafeBookingLink("")).toBe(false);
    expect(isSafeBookingLink(`https://calendly.com/${"a".repeat(300)}`)).toBe(false);
  });
});

describe("appendBookingLink", () => {
  it("appends the link on a new line when one is configured", () => {
    const result = appendBookingLink("Hi, just checking in.", "https://calendly.com/hamish/intro");
    expect(result).toBe("Hi, just checking in.\n\nPick a time that works for you: https://calendly.com/hamish/intro");
  });

  it("returns the body unchanged when no link is configured", () => {
    expect(appendBookingLink("Hi, just checking in.", null)).toBe("Hi, just checking in.");
  });

  it("returns the body unchanged for an unsafe link rather than appending it", () => {
    expect(appendBookingLink("Hi.", "javascript:alert(1)")).toBe("Hi.");
  });
});
