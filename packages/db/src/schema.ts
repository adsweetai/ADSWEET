import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Zoekt de root van de monorepo (de map met pnpm-workspace.yaml). */
export function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("Kon de root van de AdSweet-monorepo niet vinden.");
    dir = up;
  }
}

export function migrationFiles(root = findRepoRoot()): string[] {
  const dir = join(root, "supabase", "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

export function readSql(root = findRepoRoot()) {
  return {
    stub: readFileSync(join(root, "packages", "db", "sql", "supabase-stub.sql"), "utf8"),
    migrations: migrationFiles(root).map((f) => readFileSync(f, "utf8")),
    seed: readFileSync(join(root, "packages", "db", "seed.sql"), "utf8"),
  };
}

export const SEED_PATH = (root = findRepoRoot()) => join(root, "packages", "db", "seed.sql");
