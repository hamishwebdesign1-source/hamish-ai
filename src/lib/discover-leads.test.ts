import { describe, it, expect } from "vitest";
import { normaliseName, pickPairsForWeek, isoWeekIndex } from "./discover-leads";

describe("normaliseName", () => {
  it("lowercases and collapses punctuation/whitespace differences to the same key", () => {
    expect(normaliseName("The Cafe & Co.")).toBe(normaliseName("the cafe co"));
  });

  it("trims leading/trailing separators produced by stripped punctuation", () => {
    expect(normaliseName("Café!")).toBe("caf");
  });
});

describe("pickPairsForWeek", () => {
  it("returns nothing when there are no categories or no areas", () => {
    expect(pickPairsForWeek([], ["Leith"], 0, 3)).toEqual([]);
    expect(pickPairsForWeek(["Cafe"], [], 0, 3)).toEqual([]);
  });

  // The real bug this function's own comment documents: a single-pair
  // grid used to get pushed 3 times in one run (count=3, allPairs.length=1),
  // burning the whole run on one guaranteed duplicate.
  it("never returns duplicate pairs for a grid smaller than the requested count", () => {
    const pairs = pickPairsForWeek(["Cafe"], ["Leith"], 0, 3);
    expect(pairs).toEqual([{ category: "Cafe", area: "Leith" }]);
  });

  it("returns exactly `count` distinct pairs when the grid is large enough", () => {
    const pairs = pickPairsForWeek(["Cafe", "Salon"], ["Leith", "Marchmont"], 0, 3);
    expect(pairs).toHaveLength(3);
    const keys = pairs.map((p) => `${p.category}:${p.area}`);
    expect(new Set(keys).size).toBe(3);
  });

  it("advances through the grid deterministically as weekIndex increases, without immediately repeating", () => {
    const categories = ["Cafe", "Salon"];
    const areas = ["Leith", "Marchmont", "Stockbridge"];
    const week0 = pickPairsForWeek(categories, areas, 0, 2);
    const week1 = pickPairsForWeek(categories, areas, 1, 2);
    expect(week0).not.toEqual(week1);
  });

  it("wraps back to the start of the grid once weekIndex cycles all the way through", () => {
    const categories = ["Cafe"];
    const areas = ["Leith", "Marchmont"];
    // 2 pairs total, 1 per week -> week 0 and week 2 land on the same pair
    const week0 = pickPairsForWeek(categories, areas, 0, 1);
    const week2 = pickPairsForWeek(categories, areas, 2, 1);
    expect(week0).toEqual(week2);
  });

  it("produces every category x area combination, not just the first category repeated", () => {
    const pairs = pickPairsForWeek(["Cafe", "Salon"], ["Leith"], 0, 2);
    expect(pairs.map((p) => p.category).sort()).toEqual(["Cafe", "Salon"]);
  });
});

describe("isoWeekIndex", () => {
  it("advances by exactly 1 every 7 days", () => {
    const day0 = isoWeekIndex(new Date("2026-01-01T00:00:00Z"));
    const day7 = isoWeekIndex(new Date("2026-01-08T00:00:00Z"));
    expect(day7 - day0).toBe(1);
  });

  it("does not change within the same 7-day window", () => {
    const monday = isoWeekIndex(new Date("2026-01-05T00:00:00Z"));
    const fridaySameWindow = isoWeekIndex(new Date("2026-01-05T23:00:00Z"));
    expect(fridaySameWindow).toBe(monday);
  });
});
