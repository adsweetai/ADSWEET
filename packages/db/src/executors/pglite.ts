import { JSONB_COLUMNS, TABLES } from "../columns";
import { asUser, type DemoDb, type DemoTx } from "../demo";
import { assertIdent, type DbResult, type Executor, type Filter, type QuerySpec } from "../query";

const OPS: Record<Exclude<Filter["op"], "in" | "is" | "contains">, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  ilike: "ilike",
};

const quoteIdent = (c: string) => (c === "window" ? '"window"' : assertIdent(c));

function param(column: string, v: unknown): unknown {
  if (v !== null && v !== undefined && JSONB_COLUMNS.has(column)) return JSON.stringify(v);
  return v;
}

/** Zet een QuerySpec om naar SQL met parameters. */
export function toSql(spec: QuerySpec): { sql: string; params: unknown[] } {
  if (!TABLES.includes(spec.table)) throw new Error(`Onbekende tabel: ${spec.table}`);
  const table = `public.${spec.table}`;
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  const where = spec.filters.length
    ? " where " +
      spec.filters
        .map((f) => {
          const col = quoteIdent(f.column);
          if (f.op === "in") return `${col} = any(${p(f.value)})`;
          if (f.op === "is")
            return f.value === null ? `${col} is null` : `${col} is ${f.value ? "true" : "false"}`;
          if (f.op === "contains") return `${col} @> ${p(param(f.column, f.value))}`;
          return `${col} ${OPS[f.op]} ${p(param(f.column, f.value))}`;
        })
        .join(" and ")
    : "";
  const columns =
    spec.columns.trim() === "*"
      ? "*"
      : spec.columns
          .split(",")
          .map((c) => quoteIdent(c.trim()))
          .join(", ");
  const returning = spec.returning ? ` returning ${columns}` : "";

  if (spec.action === "select") {
    if (spec.head) return { sql: `select count(*)::int as count from ${table}${where}`, params };
    const order = spec.order.length
      ? " order by " +
        spec.order.map((o) => `${quoteIdent(o.column)} ${o.ascending ? "asc" : "desc"} nulls last`).join(", ")
      : "";
    const limit = spec.limit !== undefined ? ` limit ${Math.max(0, Math.floor(spec.limit))}` : "";
    return { sql: `select ${columns} from ${table}${where}${order}${limit}`, params };
  }

  if (spec.action === "delete") return { sql: `delete from ${table}${where}${returning}`, params };

  if (spec.action === "update") {
    const values = spec.values as Record<string, unknown>;
    const sets = Object.keys(values)
      .filter((c) => values[c] !== undefined)
      .map((c) => `${quoteIdent(c)} = ${p(param(c, values[c]))}`);
    return { sql: `update ${table} set ${sets.join(", ")}${where}${returning}`, params };
  }

  // insert of upsert
  const rows = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Record<string, unknown>[];
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r).filter((c) => r[c] !== undefined)))];
  const valueSql = rows
    .map((r) => `(${cols.map((c) => (r[c] === undefined ? "default" : p(param(c, r[c])))).join(", ")})`)
    .join(", ");
  let sql = `insert into ${table} (${cols.map(quoteIdent).join(", ")}) values ${valueSql}`;
  if (spec.action === "upsert") {
    const conflict = (spec.onConflict ?? "id").split(",").map((c) => quoteIdent(c.trim()));
    const updates = cols
      .filter((c) => !conflict.includes(c))
      .map((c) => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`);
    sql +=
      ` on conflict (${conflict.join(", ")}) ` +
      (updates.length ? `do update set ${updates.join(", ")}` : "do nothing");
  }
  return { sql: sql + returning, params };
}

async function run(tx: DemoTx, spec: QuerySpec): Promise<DbResult<unknown>> {
  const { sql, params } = toSql(spec);
  const res = await tx.query<Record<string, unknown>>(sql, params);
  if (spec.head) return { data: null, error: null, count: (res.rows[0]?.count as number) ?? 0 };
  const rows = res.rows;
  const count = spec.count ? rows.length : undefined;
  if (spec.single === "one") {
    if (rows.length !== 1)
      return { data: null, error: { message: `Verwachtte één rij, kreeg ${rows.length}`, code: "PGRST116" } };
    return { data: rows[0], error: null, count };
  }
  if (spec.single === "maybe") {
    if (rows.length > 1)
      return {
        data: null,
        error: { message: `Verwachtte hoogstens één rij, kreeg ${rows.length}`, code: "PGRST116" },
      };
    return { data: rows[0] ?? null, error: null, count };
  }
  return { data: spec.returning ? rows : null, error: null, count };
}

/** Voert queries uit in PGlite, als de gegeven gebruiker (RLS) of als service role (userId null). */
export function pgliteExecutor(db: DemoDb | Promise<DemoDb>, userId: string | null): Executor {
  return {
    async execute(spec) {
      try {
        const d = await db;
        return await asUser(d, userId, (tx) => run(tx, spec));
      } catch (e) {
        const err = e as { message?: string; code?: string };
        console.error(`[demo-db] ${spec.action} ${spec.table}: ${err.message ?? String(e)}`);
        return { data: null, error: { message: err.message ?? String(e), code: err.code } };
      }
    },
  };
}
