import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeed } from "./fixtures";
import { findRepoRoot, migrationFiles } from "./schema";
import { insertRows } from "./seed-sql";

// supabase/setup.sql: alles om een nieuw Supabase-project in één keer klaar te zetten via de SQL-editor. De
// migraties (tabellen, rechten, opslag) en de instellingen die echt zijn: de gepubliceerde playbookversie en de
// founding-code. Geen voorbeelddata: geen Lisa, Tom of andere voorbeeldklanten.

export const SETUP_PATH = (root = findRepoRoot()) => join(root, "supabase", "setup.sql");

export function setupSql(root = findRepoRoot()): string {
  const seed = buildSeed();
  const parts = [
    "-- AdSweet · een nieuw Supabase-project klaarzetten. Gegenereerd door `pnpm --filter @adsweet/db gen:setup`.",
    "-- Plak dit in Supabase › SQL Editor en klik op Run. Eén keer, op een leeg project.",
    "-- Niet met de hand aanpassen: wijzig supabase/migrations en genereer opnieuw.",
  ];
  for (const file of migrationFiles(root)) {
    parts.push("", `-- ===== ${file.split(/[\\/]/).pop()} =====`, "", readFileSync(file, "utf8").trim());
  }
  parts.push("", "-- ===== Instellingen =====", "", insertRows("playbook_versions", seed.playbook_versions), insertRows("discount_codes", seed.discount_codes));
  return parts.join("\n") + "\n";
}
