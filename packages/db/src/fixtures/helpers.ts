import type { TableName, Tables } from "../types";

export type SeedRow<T extends TableName> = Partial<Tables[T]>;

export interface SeedUser {
  id: string;
  email: string;
  first_name: string;
  full_name: string | null;
  last_seen_at?: string | null;
}

export type SeedTables = { [T in TableName]: SeedRow<T>[] };

export interface SeedData extends Partial<SeedTables> {
  users: SeedUser[];
}

export function emptySeed(): SeedData & SeedTables {
  return {
    users: [],
    organizations: [],
    profiles: [],
    adsweet_admins: [],
    members: [],
    invitations: [],
    ad_accounts: [],
    business_profiles: [],
    goals: [],
    documents: [],
    media: [],
    connections: [],
    campaigns: [],
    ad_sets: [],
    ads: [],
    insights_daily: [],
    playbook_versions: [],
    audit_runs: [],
    recommendations: [],
    log_entries: [],
    notifications: [],
    notification_settings: [],
    autopilot_settings: [],
    rules: [],
    assistant_threads: [],
    assistant_messages: [],
    credits_ledger: [],
    user_tours: [],
    academy_progress: [],
    invoices: [],
    discount_codes: [],
    referrals: [],
    partners: [],
    calls: [],
    waitlist: [],
  };
}

/** Opeenvolgende datums vanaf `from` (inclusief). */
export function dateRange(from: string, n: number): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Verdeelt een bedrag in centen gelijk over n dagen; de rest gaat naar de laatste dagen. */
export function spreadMoney(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i >= n - rest ? 1 : 0)) / 100);
}

/** Verdeelt een geheel aantal zo gelijk mogelijk over n dagen. */
export function spreadInt(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i >= n - rest ? 1 : 0));
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Tijdstip in Brussel (december en november: UTC+1). */
export const at = (date: string, time: string) => `${date}T${time}:00+01:00`;
