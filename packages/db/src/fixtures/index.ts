import { PLAYBOOK } from "@adsweet/playbook";
import { seedId } from "../ids";
import { buildSeed as buildScenarios } from "./scenarios";

export * from "./scenarios";
export * from "./helpers";

/** De volledige voorbeelddata: scenario's plus de gepubliceerde playbookversie. */
export function buildSeed() {
  const seed = buildScenarios();
  seed.playbook_versions.push({
    id: seedId("playbook:1.0"),
    version: "1.0",
    status: "gepubliceerd",
    rules: JSON.parse(JSON.stringify(PLAYBOOK)),
    note: "Eerste versie van het playbook.",
    published_at: "2026-11-01T09:00:00+01:00",
    created_at: "2026-11-01T09:00:00+01:00",
  });
  return seed;
}
