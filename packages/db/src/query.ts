// Een kleine, getypeerde querybouwer met dezelfde vorm als supabase-js (`db.from("x").select().eq(...)`).
// Hij draait op twee motoren: Supabase (PostgREST) en de PGlite-demodatabase. Zo bestaat de app-code maar één keer.

import type { Row, TableName } from "./types";

export type FilterOp = "eq" | "neq" | "in" | "is" | "gt" | "gte" | "lt" | "lte" | "ilike" | "contains";

export interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

export interface QuerySpec {
  table: TableName;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns: string;
  filters: Filter[];
  order: { column: string; ascending: boolean }[];
  limit?: number;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  returning: boolean;
  single?: "one" | "maybe";
  count?: boolean;
  head?: boolean;
}

export interface DbError {
  message: string;
  code?: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

export interface Executor {
  execute(spec: QuerySpec): Promise<DbResult<unknown>>;
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
export function assertIdent(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Ongeldige kolomnaam: ${name}`);
  return name;
}

export class QueryBuilder<R, Out = R[]> implements PromiseLike<DbResult<Out>> {
  constructor(
    private readonly executor: Executor,
    private readonly spec: QuerySpec,
  ) {}

  private next<O = Out>(patch: Partial<QuerySpec>): QueryBuilder<R, O> {
    return new QueryBuilder<R, O>(this.executor, { ...this.spec, ...patch });
  }
  private filter(column: keyof R & string, op: FilterOp, value: unknown) {
    return this.next({ filters: [...this.spec.filters, { column: assertIdent(column), op, value }] });
  }

  select(columns = "*", opts: { count?: "exact"; head?: boolean } = {}): QueryBuilder<R, Out> {
    return this.next({
      columns,
      returning: true,
      count: opts.count === "exact" || this.spec.count,
      head: opts.head,
    });
  }
  insert(values: Partial<R> | Partial<R>[]): QueryBuilder<R, Out> {
    return this.next({ action: "insert", values: values as QuerySpec["values"], returning: false });
  }
  upsert(values: Partial<R> | Partial<R>[], opts: { onConflict?: string } = {}): QueryBuilder<R, Out> {
    return this.next({
      action: "upsert",
      values: values as QuerySpec["values"],
      onConflict: opts.onConflict,
      returning: false,
    });
  }
  update(values: Partial<R>): QueryBuilder<R, Out> {
    return this.next({ action: "update", values: values as Record<string, unknown>, returning: false });
  }
  delete(): QueryBuilder<R, Out> {
    return this.next({ action: "delete", returning: false });
  }

  eq<K extends keyof R & string>(column: K, value: R[K]) {
    return this.filter(column, "eq", value);
  }
  neq<K extends keyof R & string>(column: K, value: R[K]) {
    return this.filter(column, "neq", value);
  }
  in<K extends keyof R & string>(column: K, values: readonly R[K][]) {
    return this.filter(column, "in", values);
  }
  is<K extends keyof R & string>(column: K, value: null | boolean) {
    return this.filter(column, "is", value);
  }
  gt<K extends keyof R & string>(column: K, value: R[K]) {
    return this.filter(column, "gt", value);
  }
  gte<K extends keyof R & string>(column: K, value: R[K]) {
    return this.filter(column, "gte", value);
  }
  lt<K extends keyof R & string>(column: K, value: R[K]) {
    return this.filter(column, "lt", value);
  }
  lte<K extends keyof R & string>(column: K, value: R[K]) {
    return this.filter(column, "lte", value);
  }
  ilike<K extends keyof R & string>(column: K, pattern: string) {
    return this.filter(column, "ilike", pattern);
  }
  contains<K extends keyof R & string>(column: K, values: R[K]) {
    return this.filter(column, "contains", values);
  }

  order(column: keyof R & string, opts: { ascending?: boolean } = {}) {
    return this.next({
      order: [...this.spec.order, { column: assertIdent(column), ascending: opts.ascending ?? true }],
    });
  }
  limit(n: number) {
    return this.next({ limit: n });
  }
  single(): QueryBuilder<R, R> {
    return this.next<R>({ single: "one", returning: true });
  }
  maybeSingle(): QueryBuilder<R, R | null> {
    return this.next<R | null>({ single: "maybe", returning: true });
  }

  then<A = DbResult<Out>, B = never>(
    onfulfilled?: ((value: DbResult<Out>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return (this.executor.execute(this.spec) as Promise<DbResult<Out>>).then(onfulfilled, onrejected);
  }
}

export interface Db {
  from<T extends TableName>(table: T): QueryBuilder<Row<T>>;
}

export function createDb(executor: Executor): Db {
  return {
    from<T extends TableName>(table: T) {
      return new QueryBuilder<Row<T>>(executor, {
        table,
        action: "select",
        columns: "*",
        filters: [],
        order: [],
        returning: true,
      });
    },
  };
}

/** Geeft de data terug of gooit de fout. Voor plekken waar een fout niet hoort te gebeuren. */
export function must<T>(res: DbResult<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
