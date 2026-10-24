// Alleen op de server: leest SQL-bestanden en draait PGlite.
export { createDemoDatabase, asUser, type DemoDb } from "./demo";
export { pgliteExecutor, toSql } from "./executors/pglite";
export { supabaseExecutor, type SupabaseLike } from "./executors/supabase";
export { findRepoRoot } from "./schema";
