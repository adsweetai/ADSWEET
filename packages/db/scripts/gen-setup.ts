import { writeFileSync } from "node:fs";
import { SETUP_PATH, setupSql } from "../src/setup-sql";

const sql = setupSql();
writeFileSync(SETUP_PATH(), sql, "utf8");
console.log(`supabase/setup.sql geschreven (${sql.length} tekens)`);
