import type { DbResult, Executor, QuerySpec } from "../query";

/* eslint-disable @typescript-eslint/no-explicit-any -- de PostgREST-bouwer van supabase-js is dynamisch getypeerd. */
export interface SupabaseLike {
  from(table: string): any;
}

/** Vertaalt een QuerySpec naar supabase-js. De rechten (RLS) volgen uit de sessie van de client. */
export function supabaseExecutor(client: SupabaseLike): Executor {
  return {
    async execute(spec: QuerySpec): Promise<DbResult<unknown>> {
      let q: any = client.from(spec.table);
      const values = spec.values;
      switch (spec.action) {
        case "select":
          q = q.select(spec.columns, { count: spec.count ? "exact" : undefined, head: spec.head });
          break;
        case "insert":
          q = q.insert(values);
          break;
        case "upsert":
          q = q.upsert(values, { onConflict: spec.onConflict });
          break;
        case "update":
          q = q.update(values);
          break;
        case "delete":
          q = q.delete();
          break;
      }
      for (const f of spec.filters) {
        if (f.op === "in") q = q.in(f.column, f.value as unknown[]);
        else if (f.op === "is") q = q.is(f.column, f.value);
        else if (f.op === "contains") q = q.contains(f.column, f.value);
        else q = q[f.op](f.column, f.value);
      }
      if (spec.action !== "select" && spec.returning) q = q.select(spec.columns);
      for (const o of spec.order) q = q.order(o.column, { ascending: o.ascending, nullsFirst: false });
      if (spec.limit !== undefined) q = q.limit(spec.limit);
      if (spec.single === "one") q = q.single();
      if (spec.single === "maybe") q = q.maybeSingle();
      const res = await q;
      return {
        data: res.data ?? null,
        error: res.error ? { message: res.error.message, code: res.error.code } : null,
        count: res.count,
      };
    },
  };
}
