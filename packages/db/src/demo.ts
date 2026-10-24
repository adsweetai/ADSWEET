// Een volwaardige Postgres in het proces (PGlite), met hetzelfde schema, dezelfde rechten (RLS) en dezelfde
// voorbeelddata als Supabase. Gebruikt door de tests en door de app zolang er geen Supabase-sleutels zijn.

import { PGlite, types, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readSql } from "./schema";

export type DemoDb = PGlite;
export type DemoTx = Transaction;

const parsers = {
  // Bedragen als getal, zoals de Supabase-API ze teruggeeft.
  [types.NUMERIC]: (v: string) => Number(v),
  [types.INT8]: (v: string) => Number(v),
  // Datums en tijdstippen als tekst, zoals de Supabase-API.
  [types.DATE]: (v: string) => v,
  [types.TIMESTAMPTZ]: (v: string) => new Date(v).toISOString(),
  [types.TIMESTAMP]: (v: string) => v,
};

export async function createDemoDatabase(options: { seed?: boolean; root?: string } = {}): Promise<DemoDb> {
  const db = await PGlite.create({ extensions: { pgcrypto }, parsers });
  const sql = readSql(options.root);
  await db.exec(sql.stub);
  for (const m of sql.migrations) await db.exec(m);
  if (options.seed !== false) await db.exec(sql.seed);
  return db;
}

/**
 * Voert `fn` uit als een ingelogde gebruiker (rol authenticated + JWT-claims), zodat RLS geldt zoals bij Supabase.
 * Zonder gebruiker draait `fn` als service role en gelden de rechten niet.
 */
export async function asUser<T>(
  db: DemoDb,
  userId: string | null,
  fn: (tx: DemoTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (userId) {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
    }
    return fn(tx);
  });
}
