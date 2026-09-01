import { describe, it, expect } from "vitest";
import { sanitizeRateCardForWrite, formatRateCardPrice } from "./rate-card";

describe("sanitizeRateCardForWrite", () => {
  it("accepts a well-formed list", () => {
    const result = sanitizeRateCardForWrite([
      { label: "Website build", pricePence: 150000, unit: "one-off" },
      { label: "Maintenance", pricePence: 5000, unit: "monthly" },
    ]);
    expect(result).toEqual([
      { label: "Website build", pricePence: 150000, unit: "one-off" },
      { label: "Maintenance", pricePence: 5000, unit: "monthly" },
    ]);
  });

  it("trims a label", () => {
    const result = sanitizeRateCardForWrite([{ label: "  Website build  ", pricePence: 100, unit: "one-off" }]);
    expect(result?.[0].label).toBe("Website build");
  });

  it("rejects a non-array", () => {
    expect(sanitizeRateCardForWrite("not an array")).toBeNull();
    expect(sanitizeRateCardForWrite(null)).toBeNull();
    expect(sanitizeRateCardForWrite(undefined)).toBeNull();
  });

  it("rejects an empty or overlong label", () => {
    expect(sanitizeRateCardForWrite([{ label: "", pricePence: 100, unit: "one-off" }])).toBeNull();
    expect(sanitizeRateCardForWrite([{ label: "a".repeat(61), pricePence: 100, unit: "one-off" }])).toBeNull();
  });

  it("rejects a negative, non-numeric, or absurdly large price", () => {
    expect(sanitizeRateCardForWrite([{ label: "x", pricePence: -100, unit: "one-off" }])).toBeNull();
    expect(sanitizeRateCardForWrite([{ label: "x", pricePence: "100", unit: "one-off" }])).toBeNull();
    expect(sanitizeRateCardForWrite([{ label: "x", pricePence: 100_000_01, unit: "one-off" }])).toBeNull();
  });

  it("rejects an invalid unit", () => {
    expect(sanitizeRateCardForWrite([{ label: "x", pricePence: 100, unit: "yearly" }])).toBeNull();
  });

  it("rejects a list past the item cap", () => {
    const items = Array.from({ length: 13 }, (_, i) => ({ label: `Item ${i}`, pricePence: 100, unit: "one-off" as const }));
    expect(sanitizeRateCardForWrite(items)).toBeNull();
  });

  it("accepts an empty list", () => {
    expect(sanitizeRateCardForWrite([])).toEqual([]);
  });
});

describe("formatRateCardPrice", () => {
  it("formats a whole-pound one-off price with no decimals", () => {
    expect(formatRateCardPrice({ label: "x", pricePence: 150000, unit: "one-off" })).toBe("£1,500");
  });

  it("formats a monthly price with a /mo suffix", () => {
    expect(formatRateCardPrice({ label: "x", pricePence: 5000, unit: "monthly" })).toBe("£50/mo");
  });

  it("keeps pence precision when the price isn't a whole pound", () => {
    expect(formatRateCardPrice({ label: "x", pricePence: 4999, unit: "one-off" })).toBe("£49.99");
  });
});
