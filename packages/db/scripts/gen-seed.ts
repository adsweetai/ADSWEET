import { writeFileSync } from "node:fs";
import { buildSeed } from "../src/fixtures";
import { SEED_PATH } from "../src/schema";
import { seedToSql } from "../src/seed-sql";

const sql = seedToSql(buildSeed());
writeFileSync(SEED_PATH(), sql, "utf8");
console.log(`seed.sql geschreven (${sql.length} tekens)`);
