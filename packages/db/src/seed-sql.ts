import type { SeedData, SeedTables } from "./fixtures/helpers";
import type { TableName } from "./types";

// Kolommen van het type jsonb: arrays daarin worden JSON, geen Postgres-array.
const JSONB = new Set([
  "offers",
  "contact",
  "extracted",
  "details",
  "targeting",
  "utm",
  "extras",
  "variants",
  "rules",
  "summary",
  "payload",
  "limits",
  "tool_calls",
  "pending_change",
  "naming",
  "undo",
  "metadata",
]);

// Volgorde respecteert de verwijzingen tussen tabellen.
const ORDER: TableName[] = [
  "adsweet_admins",
  "organizations",
  "members",
  "invitations",
  "ad_accounts",
  "business_profiles",
  "goals",
  "documents",
  "media",
  "connections",
  "campaigns",
  "ad_sets",
  "ads",
  "insights_daily",
  "playbook_versions",
  "audit_runs",
  "recommendations",
  "log_entries",
  "notifications",
  "notification_settings",
  "autopilot_settings",
  "rules",
  "assistant_threads",
  "assistant_messages",
  "credits_ledger",
  "user_tours",
  "academy_progress",
  "invoices",
  "discount_codes",
  "referrals",
  "partners",
  "calls",
  "waitlist",
  "preview_links",
  "preview_feedback",
];

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function sqlValue(col: string, v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "string") return q(v);
  if (JSONB.has(col)) return `${q(JSON.stringify(v))}::jsonb`;
  if (Array.isArray(v)) return q(`{${v.map((x) => `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`);
  return `${q(JSON.stringify(v))}::jsonb`;
}

export function insertRows(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  // Groepeer per kolomset, zodat elke insert dezelfde kolommen heeft.
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const cols = Object.keys(r).filter((c) => r[c] !== undefined);
    const key = cols.join(",");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out: string[] = [];
  for (const [key, list] of groups) {
    const cols = key.split(",");
    const colSql = cols.map((c) => (c === "window" ? '"window"' : c)).join(", ");
    for (let i = 0; i < list.length; i += 200) {
      const values = list
        .slice(i, i + 200)
        .map((r) => `  (${cols.map((c) => sqlValue(c, r[c])).join(", ")})`)
        .join(",\n");
      out.push(`insert into public.${table} (${colSql}) values\n${values};`);
    }
  }
  return out.join("\n");
}

export function seedToSql(seed: SeedData & SeedTables): string {
  const parts: string[] = [
    "-- AdSweet · voorbeelddata (Lisa, Tom, Sarah, Bram, Eva). Gegenereerd door `pnpm --filter @adsweet/db gen:seed`.",
    "-- Niet met de hand aanpassen: wijzig packages/db/src/fixtures en genereer opnieuw.",
    "",
    "-- Gebruikers (inloggen met een link per mail; geen wachtwoord)",
  ];
  for (const u of seed.users) {
    const meta = JSON.stringify({ first_name: u.first_name, full_name: u.full_name ?? undefined });
    parts.push(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values ('00000000-0000-0000-0000-000000000000', ${q(u.id)}, 'authenticated', 'authenticated', ${q(u.email)}, '', now(), '{"provider":"email","providers":["email"]}', ${q(meta)}, now(), now(), '', '', '', '');`,
      `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values (${q(u.id)}, ${q(u.id)}, ${q(JSON.stringify({ sub: u.id, email: u.email, email_verified: true }))}, 'email', now(), now(), now());`,
    );
  }
  for (const u of seed.users) {
    if (u.last_seen_at) parts.push(`update public.profiles set last_seen_at = ${q(u.last_seen_at)} where user_id = ${q(u.id)};`);
  }
  for (const table of ORDER) {
    const rows = (seed[table] ?? []) as Record<string, unknown>[];
    const sql = insertRows(table, rows);
    if (sql) parts.push("", `-- ${table}`, sql);
  }
  return parts.join("\n") + "\n";
}
