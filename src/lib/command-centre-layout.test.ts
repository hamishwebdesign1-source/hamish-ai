import { describe, it, expect } from "vitest";
import { sanitizeBlocksForWrite, resolveLayout, DEFAULT_LAYOUT, statBlockId } from "./command-centre-layout";

describe("sanitizeBlocksForWrite", () => {
  it("returns null for a non-array input", () => {
    expect(sanitizeBlocksForWrite(null)).toBeNull();
    expect(sanitizeBlocksForWrite("nope")).toBeNull();
    expect(sanitizeBlocksForWrite({})).toBeNull();
  });

  it("returns null when every entry is invalid rather than saving an empty layout", () => {
    expect(sanitizeBlocksForWrite([{ type: "not-a-real-type" }, null, "garbage", 42])).toBeNull();
  });

  it("keeps a valid stat block and defaults a missing span to 1", () => {
    const result = sanitizeBlocksForWrite([{ type: "stat", cardId: "health" }]);
    expect(result).toEqual([{ id: statBlockId("health"), type: "stat", cardId: "health", span: 1 }]);
  });

  it("drops a stat block with an unrecognised cardId", () => {
    expect(sanitizeBlocksForWrite([{ type: "stat", cardId: "not-a-real-card" }])).toBeNull();
  });

  it("dedups singleton stat and section blocks, keeping only the first occurrence", () => {
    const result = sanitizeBlocksForWrite([
      { type: "stat", cardId: "health", span: 2 },
      { type: "stat", cardId: "health", span: 1 },
      { type: "insights" },
      { type: "insights" },
    ]);
    expect(result).toEqual([
      { id: statBlockId("health"), type: "stat", cardId: "health", span: 2 },
      { id: "insights", type: "insights" },
    ]);
  });

  it("does not dedup chart/text/cta blocks — multiple real instances are the point", () => {
    const result = sanitizeBlocksForWrite([
      { id: "chart:a", type: "chart", metric: "revenue", kind: "area", range: "30d" },
      { id: "chart:b", type: "chart", metric: "revenue", kind: "area", range: "30d" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("defaults a chart block's range to 30d when missing or invalid, for backward compatibility", () => {
    const missing = sanitizeBlocksForWrite([{ id: "chart:a", type: "chart", metric: "revenue", kind: "bar" }]);
    expect(missing?.[0]).toMatchObject({ range: "30d" });

    const invalid = sanitizeBlocksForWrite([{ id: "chart:a", type: "chart", metric: "revenue", kind: "bar", range: "5y" }]);
    expect(invalid?.[0]).toMatchObject({ range: "30d" });
  });

  it("drops a chart block missing a required field (metric, kind, or id)", () => {
    expect(sanitizeBlocksForWrite([{ id: "chart:a", type: "chart", kind: "bar", range: "30d" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ id: "chart:a", type: "chart", metric: "revenue", range: "30d" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ type: "chart", metric: "revenue", kind: "bar", range: "30d" }])).toBeNull();
  });

  it("clamps and trims text block title/body, dropping empty or oversized values", () => {
    const ok = sanitizeBlocksForWrite([{ id: "text:a", type: "text", title: "  Hello  ", body: "World" }]);
    expect(ok?.[0]).toMatchObject({ title: "Hello", body: "World" });

    expect(sanitizeBlocksForWrite([{ id: "text:a", type: "text", title: "", body: "World" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ id: "text:a", type: "text", title: "x".repeat(61), body: "World" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ id: "text:a", type: "text", title: "Hi", body: "x".repeat(501) }])).toBeNull();
  });

  it("accepts a safe internal path or https href for a cta block", () => {
    const internal = sanitizeBlocksForWrite([{ id: "cta:a", type: "cta", label: "Go", href: "/studio/billing" }]);
    expect(internal?.[0]).toMatchObject({ href: "/studio/billing" });

    const external = sanitizeBlocksForWrite([{ id: "cta:a", type: "cta", label: "Go", href: "https://hamishai.org" }]);
    expect(external?.[0]).toMatchObject({ href: "https://hamishai.org" });
  });

  it("rejects a cta href that isn't a safe internal path or https URL", () => {
    // Protocol-relative and dangerous schemes must never reach a real <a href>.
    expect(sanitizeBlocksForWrite([{ id: "cta:a", type: "cta", label: "Go", href: "//evil.com" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ id: "cta:a", type: "cta", label: "Go", href: "javascript:alert(1)" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ id: "cta:a", type: "cta", label: "Go", href: "http://insecure.com" }])).toBeNull();
    expect(sanitizeBlocksForWrite([{ id: "cta:a", type: "cta", label: "Go", href: "data:text/html,<script>1</script>" }])).toBeNull();
  });

  it("silently skips non-object entries mixed in with valid ones", () => {
    const result = sanitizeBlocksForWrite([null, "garbage", 42, { type: "insights" }]);
    expect(result).toEqual([{ id: "insights", type: "insights" }]);
  });
});

describe("resolveLayout", () => {
  it("falls back to the default layout for missing, garbage, or wrong-version stored data", () => {
    expect(resolveLayout(null)).toEqual(DEFAULT_LAYOUT.blocks);
    expect(resolveLayout("nonsense")).toEqual(DEFAULT_LAYOUT.blocks);
    expect(resolveLayout({ version: 99, blocks: [] })).toEqual(DEFAULT_LAYOUT.blocks);
  });

  it("falls back to the default layout when a version-2 store has no valid blocks", () => {
    expect(resolveLayout({ version: 2, blocks: [{ type: "garbage" }] })).toEqual(DEFAULT_LAYOUT.blocks);
  });

  it("returns the sanitized blocks for a valid version-2 store", () => {
    const stored = { version: 2, blocks: [{ type: "insights" }, { type: "stat", cardId: "clients", span: 2 }] };
    expect(resolveLayout(stored)).toEqual([
      { id: "insights", type: "insights" },
      { id: statBlockId("clients"), type: "stat", cardId: "clients", span: 2 },
    ]);
  });

  it("upgrades a version-1 store (id-only blocks) into the version-2 shape", () => {
    const stored = { version: 1, blocks: [{ id: "stat:pipeline", span: 1 }, { id: "briefing" }] };
    expect(resolveLayout(stored)).toEqual([
      { id: statBlockId("pipeline"), type: "stat", cardId: "pipeline", span: 1 },
      { id: "briefing", type: "briefing" },
    ]);
  });

  it("falls back to the default layout when a version-1 store has no valid blocks", () => {
    expect(resolveLayout({ version: 1, blocks: [{ id: "not-a-real-id" }] })).toEqual(DEFAULT_LAYOUT.blocks);
  });
});
