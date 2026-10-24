import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { findRepoRoot } from "./schema";
import { SETUP_PATH, setupSql } from "./setup-sql";

describe("supabase/setup.sql", () => {
  it("is in lijn met de migraties", () => {
    expect(readFileSync(SETUP_PATH(), "utf8")).toBe(setupSql());
  });

  it("draait in één keer op een leeg project, zonder voorbeelddata", async () => {
    const db = await PGlite.create({ extensions: { pgcrypto } });
    await db.exec(readFileSync(join(findRepoRoot(), "packages", "db", "sql", "supabase-stub.sql"), "utf8"));
    await db.exec(readFileSync(SETUP_PATH(), "utf8"));
    const count = async (table: string) => (await db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n;
    expect(await count("public.organizations")).toBe(0);
    expect(await count("auth.users")).toBe(0);
    expect(await count("public.playbook_versions")).toBe(1);
    expect((await db.query<{ code: string }>("select code from public.discount_codes")).rows.map((r) => r.code)).toEqual(["FOUNDING50"]);
    expect(await count("storage.buckets")).toBe(3);
    await db.close();
  });
});
