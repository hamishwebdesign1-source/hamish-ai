// A single-line JSON log entry rather than a free-text console.error
// string, scoped to the routes where it earns its keep: billing and auth
// (the roadmap's own scope for this) -- not a sweeping rewrite of every
// console.log in the app. Vercel's log viewer shows stdout/stderr as-is,
// so one JSON object per line is immediately filterable/searchable there
// with no new dependency (no pino/winston) and no log drain to configure
// — the same "use what's already there" call as the rate limiter and the
// Customer Portal work this phase. If a real log aggregator or Sentry
// breadcrumbs get added later, every call site here already has the
// shape (event name + structured context) that integration would want.
type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  const entry = { ts: new Date().toISOString(), level, event, ...context };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logInfo = (event: string, context?: Record<string, unknown>) => write("info", event, context);
export const logWarn = (event: string, context?: Record<string, unknown>) => write("warn", event, context);
export const logError = (event: string, context?: Record<string, unknown>) => write("error", event, context);
