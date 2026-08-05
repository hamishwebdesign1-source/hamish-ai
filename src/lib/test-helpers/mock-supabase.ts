// A minimal, in-memory stand-in for a Supabase query builder, used to unit
// test the tenant-scoping logic in portal-insights-data.ts and
// answer-account-question.ts without a real database. Unlike a dumb stub
// that always returns the same rows, this one actually applies .eq()/.in()
// filters against the configured table data — so a test can genuinely
// assert "client A's session only ever gets client A's rows back," the
// same property RLS enforces for real in Postgres.
//
// Supports exactly the chain shapes these two files use: .select().eq().single(),
// .select().eq() awaited directly, .select().in() awaited directly,
// .select().eq().order().limit() awaited directly, and .select().or(...)
// with PostgREST's "col.eq.val,col.is.null" mini-syntax. Not a
// general-purpose Supabase mock — extend it if a new call shape is needed.

type Row = Record<string, unknown>;

function applyFilters(rows: Row[], filters: { type: "eq" | "in"; col: string; val: unknown }[]) {
  return rows.filter((row) =>
    filters.every((f) => {
      if (f.type === "eq") return row[f.col] === f.val;
      if (f.type === "in") return Array.isArray(f.val) && (f.val as unknown[]).includes(row[f.col]);
      return true;
    })
  );
}

// Parses PostgREST's `.or("col.eq.val,col.is.null")` syntax into a
// predicate. Only the two operators this project actually uses are
// supported — extend it if a new one shows up.
function parseOrExpression(expr: string) {
  const conditions = expr.split(",").map((clause) => {
    const [col, op, val] = clause.split(".");
    return { col, op, val };
  });
  return (row: Row) =>
    conditions.some(({ col, op, val }) => {
      if (op === "is" && val === "null") return row[col] === null || row[col] === undefined;
      if (op === "eq") return String(row[col]) === val;
      return false;
    });
}

export function createMockSupabase(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const filters: { type: "eq" | "in"; col: string; val: unknown }[] = [];
      let orPredicate: ((row: Row) => boolean) | null = null;
      let orderCol: string | null = null;
      let orderAsc = true;
      let limitN: number | null = null;

      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push({ type: "eq", col, val });
          return builder;
        },
        in(col: string, vals: unknown[]) {
          filters.push({ type: "in", col, val: vals });
          return builder;
        },
        or(expr: string) {
          orPredicate = parseOrExpression(expr);
          return builder;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderCol = col;
          orderAsc = opts?.ascending ?? true;
          return builder;
        },
        limit(n: number) {
          limitN = n;
          return builder;
        },
        _resolve() {
          let rows = applyFilters(tables[table] ?? [], filters);
          if (orPredicate) rows = rows.filter(orPredicate);
          if (orderCol) {
            const col = orderCol;
            rows = [...rows].sort((a, b) => {
              const av = a[col] as string;
              const bv = b[col] as string;
              return orderAsc ? (av < bv ? -1 : 1) : av < bv ? 1 : -1;
            });
          }
          if (limitN !== null) rows = rows.slice(0, limitN);
          return rows;
        },
        single() {
          const rows = builder._resolve();
          return Promise.resolve(
            rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "No rows found" } }
          );
        },
        maybeSingle() {
          const rows = builder._resolve();
          return Promise.resolve({ data: rows[0] ?? null, error: null });
        },
        // Makes the builder itself awaitable — `await supabase.from(x).select().eq(...)`
        // resolves to { data, error } directly, matching real supabase-js.
        then(resolve: (value: { data: Row[]; error: null }) => unknown) {
          return Promise.resolve({ data: builder._resolve(), error: null }).then(resolve);
        },
      };

      return builder;
    },
  };
}
