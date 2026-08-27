import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CRON_SPECS } from "./cron-schedule";

// vercel.json and CRON_SPECS are two hand-maintained files describing the
// same 13 real jobs - this file's own header explicitly calls out the
// discipline of folding new periodic work into an existing cron rather
// than adding a new vercel.json entry, specifically because that pairing
// has no compiler check keeping it honest. This test is that check.
const vercelJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf-8")) as {
  crons: { path: string; schedule: string }[];
};

function parseCron(expr: string): { minute: number; hour: number; dayOfMonth: string; dayOfWeek: string } {
  const [minute, hour, dayOfMonth, , dayOfWeek] = expr.split(" ");
  return { minute: Number(minute), hour: Number(hour), dayOfMonth, dayOfWeek };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CRON_SPECS <-> vercel.json consistency", () => {
  it("has exactly one CRON_SPECS entry per vercel.json cron, matched by route path", () => {
    expect(CRON_SPECS).toHaveLength(vercelJson.crons.length);
    for (const spec of CRON_SPECS) {
      const match = vercelJson.crons.find((c) => c.path === `/api/cron/${spec.name}`);
      expect(match, `vercel.json is missing a cron entry for "${spec.name}"`).toBeTruthy();
    }
  });

  it("has an identical schedule string in both files for every job", () => {
    for (const spec of CRON_SPECS) {
      const match = vercelJson.crons.find((c) => c.path === `/api/cron/${spec.name}`)!;
      expect(spec.schedule, `${spec.name}'s CRON_SPECS.schedule disagrees with vercel.json`).toBe(match.schedule);
    }
  });

  it("has a real route folder under src/app/api/cron for every spec", () => {
    for (const spec of CRON_SPECS) {
      const routeDir = path.join(process.cwd(), "src/app/api/cron", spec.name);
      expect(fs.existsSync(routeDir), `no route folder for "${spec.name}"`).toBe(true);
    }
  });

  it("has no duplicate job names", () => {
    const names = CRON_SPECS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("CronSpec.nextRun()", () => {
  it("always returns a time strictly after now", () => {
    vi.setSystemTime(new Date("2026-06-15T13:47:00Z"));
    for (const spec of CRON_SPECS) {
      expect(spec.nextRun().getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("computes a UTC hour/minute matching the spec's own schedule string for every job", () => {
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    for (const spec of CRON_SPECS) {
      const { minute, hour } = parseCron(spec.schedule);
      const next = spec.nextRun();
      expect(next.getUTCHours(), `${spec.name} hour`).toBe(hour);
      expect(next.getUTCMinutes(), `${spec.name} minute`).toBe(minute);
    }
  });

  it("lands a weekly job's nextRun on the weekday its schedule string specifies", () => {
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z")); // a Monday
    for (const spec of CRON_SPECS) {
      const { dayOfWeek } = parseCron(spec.schedule);
      if (dayOfWeek === "*") continue;
      expect(spec.nextRun().getUTCDay(), spec.name).toBe(Number(dayOfWeek));
    }
  });

  it("lands a monthly job's nextRun on the day-of-month its schedule string specifies", () => {
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    for (const spec of CRON_SPECS) {
      const { dayOfMonth } = parseCron(spec.schedule);
      if (dayOfMonth === "*") continue;
      expect(spec.nextRun().getUTCDate(), spec.name).toBe(Number(dayOfMonth));
    }
  });

  it("rolls a daily job to tomorrow when now is exactly its scheduled fire time", () => {
    // self-check fires at 06:00 UTC daily - being at exactly that instant
    // must mean "already fired for today", not "fire again right now".
    vi.setSystemTime(new Date("2026-06-15T06:00:00.000Z"));
    const selfCheck = CRON_SPECS.find((s) => s.name === "self-check")!;
    expect(selfCheck.nextRun().getUTCDate()).toBe(16);
  });

  it("rolls a monthly job to next month when now is exactly its scheduled fire time", () => {
    // recurring-invoices fires at 09:00 UTC on the 1st.
    vi.setSystemTime(new Date("2026-06-01T09:00:00.000Z"));
    const invoices = CRON_SPECS.find((s) => s.name === "recurring-invoices")!;
    const next = invoices.nextRun();
    expect(next.getUTCMonth()).toBe(6); // July (0-indexed)
    expect(next.getUTCDate()).toBe(1);
  });
});
