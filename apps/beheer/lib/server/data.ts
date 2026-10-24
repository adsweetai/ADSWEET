import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getTranslations } from "next-intl/server";
import { must, type PlaybookVersion } from "@adsweet/db";
import { findRepoRoot } from "@adsweet/db/server";
import { FOUNDING_MAX, PLAN_LIMITS, TRIAL_CREDITS, planPrice, type PlanId } from "@adsweet/playbook";
import { formatDateTime, formatDayMonth, formatEuro, formatLongDate } from "@adsweet/ui";
import { nowIso, today } from "@/lib/clock";
import { diffRules, nextVersion, rulesOf, versionOrder, type Rules } from "@/lib/playbook";
import { requireAdmin, serviceDb } from "./auth";
import { ownerEmail, sendMail } from "./mail";

// Gegevens voor de schermen van Beheer. Elke functie controleert eerst of je adsweet_admin bent; daarna lezen we
// zonder RLS, want een beheerder ziet alle klanten.

export const eur = (n: number) => formatEuro(n, Math.round(n) === n ? 0 : 2);
export type Tone = "ok" | "warn" | "act" | "neutral";
export interface Badge {
  text: string;
  tone: Tone;
}

async function admin() {
  const user = await requireAdmin();
  return { user, db: serviceDb() };
}

// ---------------------------------------------------------------------------
// Playbook en versies
// ---------------------------------------------------------------------------

export interface PlaybookPageVM {
  concept: { version: string; note: string; rules: Rules } | null;
  published: { version: string; date: string | null; rules: Rules } | null;
  next: string;
}

const sorted = (v: PlaybookVersion[]) => [...v].sort((a, b) => versionOrder(a.version, b.version));

export async function loadPlaybook(): Promise<PlaybookPageVM> {
  const { db } = await admin();
  const versions = sorted(must(await db.from("playbook_versions").select()));
  const concept = versions.find((v) => v.status === "concept") ?? null;
  const published = versions.find((v) => v.status === "gepubliceerd") ?? null;
  return {
    concept: concept ? { version: concept.version, note: concept.note ?? "", rules: rulesOf(concept.rules) } : null,
    published: published
      ? {
          version: published.version,
          date: published.published_at ? formatDayMonth(published.published_at.slice(0, 10)) : null,
          rules: rulesOf(published.rules),
        }
      : null,
    next: nextVersion(versions.map((v) => v.version)),
  };
}

export interface VersionRow {
  version: string;
  status: "concept" | "gepubliceerd" | "gearchiveerd";
  date: string;
  note: string;
}

export async function loadVersions(): Promise<{
  rows: VersionRow[];
  diff: { key: string; from: number; to: number }[] | null;
  concept: string | null;
  published: string | null;
}> {
  const { db } = await admin();
  const versions = sorted(must(await db.from("playbook_versions").select()));
  const concept = versions.find((v) => v.status === "concept") ?? null;
  const published = versions.find((v) => v.status === "gepubliceerd") ?? null;
  return {
    rows: versions.map((v) => ({
      version: v.version,
      status: v.status,
      date: formatDayMonth((v.published_at ?? v.created_at).slice(0, 10)),
      note: v.note ?? "",
    })),
    diff: concept && published ? diffRules(rulesOf(published.rules), rulesOf(concept.rules)) : null,
    concept: concept?.version ?? null,
    published: published?.version ?? null,
  };
}

/** Bewaart het concept. Is er nog geen concept, dan maken we de volgende versie aan. */
export async function saveConcept(rules: Rules, note: string): Promise<string> {
  const { user, db } = await admin();
  const versions = must(await db.from("playbook_versions").select());
  const concept = versions.find((v) => v.status === "concept");
  const clean = note.trim().slice(0, 300) || null;
  if (concept) {
    await db
      .from("playbook_versions")
      .update({ rules: rules as never, note: clean })
      .eq("id", concept.id);
    return concept.version;
  }
  const version = nextVersion(versions.map((v) => v.version));
  await db.from("playbook_versions").insert({ version, status: "concept", rules: rules as never, note: clean, created_by: user.id });
  return version;
}

/** Publiceert het concept als nieuwe versie. De vorige gepubliceerde versie wordt vervangen (gearchiveerd). */
export async function publishConcept(): Promise<string | null> {
  const { db } = await admin();
  const versions = must(await db.from("playbook_versions").select());
  const concept = versions.find((v) => v.status === "concept");
  if (!concept) return null;
  for (const v of versions.filter((x) => x.status === "gepubliceerd")) await db.from("playbook_versions").update({ status: "gearchiveerd" }).eq("id", v.id);
  await db.from("playbook_versions").update({ status: "gepubliceerd", published_at: nowIso() }).eq("id", concept.id);
  return concept.version;
}

/** Zet een oude versie terug: haar regels worden het concept, klaar om opnieuw te publiceren. */
export async function restoreVersion(version: string): Promise<string | null> {
  const { db } = await admin();
  const t = await getTranslations("versions");
  const old = must(await db.from("playbook_versions").select().eq("version", version).maybeSingle());
  if (!old) return null;
  return saveConcept(rulesOf(old.rules), t("restoredNote", { version }));
}

// ---------------------------------------------------------------------------
// Klanten, AI-kosten, kortingscodes, partners, calls, systeem
// ---------------------------------------------------------------------------

export interface ClientRow {
  id: string;
  name: string;
  plan: PlanId;
  period: string;
  trialDay: string;
  founding: boolean;
  pays: string;
  lastSeen: string;
  status: Badge;
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

export async function loadClients(): Promise<{ rows: ClientRow[]; founding: number }> {
  const { db } = await admin();
  const t = await getTranslations("clients");
  const [orgs, members, profiles, accounts, conns] = await Promise.all([
    db.from("organizations").select().order("created_at").then(must),
    db.from("members").select("organization_id, user_id, role").then(must),
    db.from("profiles").select("user_id, last_seen_at").then(must),
    db.from("ad_accounts").select("organization_id, status").then(must),
    db.from("connections").select("organization_id, provider, status, pixel_ok").then(must),
  ]);
  // Klanten van een bureau betalen via het bureau: die staan niet apart in de lijst.
  const billed = orgs.filter((o) => !o.agency_parent_id);
  const day = today();
  return {
    founding: orgs.filter((o) => o.founding).length,
    rows: billed.map((o) => {
      const plan = o.plan as PlanId;
      const price = eur(planPrice(plan, o.founding));
      const owner = members.find((m) => m.organization_id === o.id && m.role === "eigenaar");
      const seen = profiles.find((p) => p.user_id === owner?.user_id)?.last_seen_at?.slice(0, 10) ?? null;
      const ago = seen ? dayDiff(seen, day) : null;
      const accs = accounts.filter((a) => a.organization_id === o.id);
      const meta = conns.filter((c) => c.organization_id === o.id && c.provider === "meta");
      const status: Badge = accs.some((a) => a.status === "betaalprobleem")
        ? { text: t("status.payment"), tone: "act" }
        : meta.some((c) => c.status === "verlopen")
          ? { text: t("status.expired"), tone: "act" }
          : meta.some((c) => c.pixel_ok === false)
            ? { text: t("status.pixel"), tone: "warn" }
            : meta.length
              ? { text: t("status.ok"), tone: "ok" }
              : { text: t("status.none"), tone: "neutral" };
      return {
        id: o.id,
        name: o.name,
        plan,
        period: o.billing_period,
        trialDay: o.subscription_status === "proef" && o.trial_started_at ? t("trialDay", { day: dayDiff(o.trial_started_at, day) + 1 }) : "–",
        founding: o.founding,
        pays:
          o.subscription_status === "proef" && o.trial_ends_at
            ? t("paysFrom", { price, date: formatDayMonth(o.trial_ends_at) })
            : o.subscription_status === "opgezegd" || o.subscription_status === "verlopen"
              ? t(`subStatus.${o.subscription_status}`)
              : plan === "agency"
                ? t("from", { price })
                : price,
        lastSeen: ago === null ? "–" : ago <= 0 ? t("today") : ago === 1 ? t("yesterday") : t("daysAgo", { n: ago }),
        status,
      };
    }),
  };
}

export const FOUNDING_LIMIT = FOUNDING_MAX;

export async function loadAiCosts() {
  const { db } = await admin();
  const [orgs, ledger] = await Promise.all([db.from("organizations").select().then(must), db.from("credits_ledger").select().then(must)]);
  const rows = orgs
    .filter((o) => !o.agency_parent_id && PLAN_LIMITS[o.plan as PlanId].credits > 0)
    .map((o) => {
      const mine = ledger.filter((l) => l.organization_id === o.id);
      const used = -mine.filter((l) => l.delta < 0).reduce((s, l) => s + l.delta, 0);
      const total = o.subscription_status === "proef" ? TRIAL_CREDITS : PLAN_LIMITS[o.plan as PlanId].credits;
      const cost = mine.some((l) => l.cost_eur !== null) ? mine.reduce((s, l) => s + Number(l.cost_eur ?? 0), 0) : null;
      const models = [...new Set(mine.map((l) => l.model).filter(Boolean))] as string[];
      return { id: o.id, name: o.name, plan: o.plan as PlanId, used, total, cost, models };
    });
  const plans = (["pro", "scale", "agency"] as PlanId[]).map((p) => {
    const onPlan = rows.filter((r) => r.plan === p && r.cost !== null);
    const cost = onPlan.length ? onPlan.reduce((s, r) => s + (r.cost ?? 0), 0) / onPlan.length : null;
    return { plan: p, price: PLAN_LIMITS[p].price, credits: PLAN_LIMITS[p].credits, cost, margin: cost === null ? null : PLAN_LIMITS[p].price - cost };
  });
  return { rows, plans };
}

export async function loadCodes() {
  const { db } = await admin();
  return must(await db.from("discount_codes").select().order("created_at"));
}

export async function createCode(input: {
  code: string;
  kind: "founding" | "doorverwijzing" | "partner";
  percent: number | null;
  months: number | null;
  max: number | null;
}) {
  const { db } = await admin();
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return { ok: false as const, error: "code" as const };
  if (!["founding", "doorverwijzing", "partner"].includes(input.kind)) return { ok: false as const, error: "kind" as const };
  const exists = must(await db.from("discount_codes").select("id").eq("code", code).maybeSingle());
  if (exists) return { ok: false as const, error: "exists" as const };
  await db.from("discount_codes").insert({
    code,
    kind: input.kind,
    percent_off: input.percent && input.percent > 0 && input.percent <= 100 ? Math.round(input.percent) : null,
    months_free: input.months && input.months > 0 ? Math.round(input.months) : null,
    max_uses: input.max && input.max > 0 ? Math.round(input.max) : null,
    uses: 0,
    active: true,
  });
  return { ok: true as const };
}

export async function loadPartners() {
  const { db } = await admin();
  const [partners, orgs] = await Promise.all([db.from("partners").select().order("created_at").then(must), db.from("organizations").select().then(must)]);
  return partners.map((p) => {
    const clients = p.code ? orgs.filter((o) => o.discount_code === p.code) : [];
    const commission = clients.reduce((s, o) => s + planPrice(o.plan as PlanId, o.founding) * 0.3, 0);
    return { id: p.id, name: p.company ? `${p.name} · ${p.company}` : p.name, status: p.status, clients: clients.length, commission };
  });
}

export async function approvePartner(id: string) {
  const { db } = await admin();
  const p = must(await db.from("partners").select().eq("id", id).maybeSingle());
  if (!p || p.status !== "aanmelding") return;
  const code = p.code ?? `PARTNER-${p.id.slice(0, 6).toUpperCase()}`;
  await db.from("partners").update({ status: "actief", code }).eq("id", id);
}

export async function loadCalls() {
  const { db } = await admin();
  const [calls, orgs] = await Promise.all([db.from("calls").select().order("created_at").then(must), db.from("organizations").select("id, name").then(must)]);
  const order = { te_plannen: 0, gepland: 1, gedaan: 2 } as const;
  return calls
    .sort((a, b) => order[a.status] - order[b.status] || (a.starts_at ?? a.created_at).localeCompare(b.starts_at ?? b.created_at))
    .map((c) => ({
      id: c.id,
      client: orgs.find((o) => o.id === c.organization_id)?.name ?? "",
      kind: c.kind,
      status: c.status,
      when: c.starts_at ? formatDateTime(c.starts_at) : null,
    }));
}

export async function planCall(id: string, startsAt: string) {
  const { db } = await admin();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) return false;
  const call = must(await db.from("calls").select().eq("id", id).maybeSingle());
  if (!call) return false;
  // Het uur is Belgische tijd.
  const at = new Date(`${startsAt}:00+01:00`).toISOString();
  await db.from("calls").update({ starts_at: at, status: "gepland" }).eq("id", id);
  // Mails.dc.html: Kwartaalcall bevestigd, naar de eigenaar van de klant.
  if (call.kind === "kwartaal") {
    const to = await ownerEmail(call.organization_id);
    if (to) await sendMail("kwartaalcall", to, { date: formatLongDate(startsAt.slice(0, 10)), time: startsAt.slice(11, 16) });
  }
  return true;
}

export async function callDone(id: string) {
  const { db } = await admin();
  await db.from("calls").update({ status: "gedaan" }).eq("id", id);
}

export async function loadSystem() {
  const { db } = await admin();
  const [conns, audit, autopilot, notes] = await Promise.all([
    db.from("connections").select("provider, status").then(must),
    db.from("audit_runs").select("ran_at").order("ran_at", { ascending: false }).limit(1).maybeSingle().then(must),
    db.from("log_entries").select("at").eq("actor", "autopilot").order("at", { ascending: false }).limit(1).maybeSingle().then(must),
    db.from("notifications").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle().then(must),
  ]);
  const count = (provider: string) => {
    const c = conns.filter((x) => x.provider === provider);
    return { total: c.length, bad: c.filter((x) => x.status === "verlopen" || x.status === "fout").length };
  };
  return {
    meta: count("meta"),
    google: count("google_ads"),
    audit: audit?.ran_at ? formatDateTime(audit.ran_at) : null,
    autopilot: autopilot?.at ? formatDateTime(autopilot.at) : null,
    notifications: notes?.created_at ? formatDateTime(notes.created_at) : null,
  };
}

// ---------------------------------------------------------------------------
// Teksten en Academy: uit de teksten van de app (apps/app/messages)
// ---------------------------------------------------------------------------

async function appMessages(locale: "nl" | "fr" | "en"): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(join(findRepoRoot(), "apps", "app", "messages", `${locale}.json`), "utf8"));
  } catch {
    return null;
  }
}

function flatten(o: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof o === "string") out[prefix] = o;
  else if (Array.isArray(o)) o.forEach((x, i) => flatten(x, `${prefix}.${i}`, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

export async function loadTexts(q: string, missingOnly: boolean, limit = 150) {
  await admin();
  const [nl, fr, en] = await Promise.all([appMessages("nl"), appMessages("fr"), appMessages("en")]);
  const fnl = flatten(nl ?? {});
  const ffr = flatten(fr ?? {});
  const fen = flatten(en ?? {});
  const query = q.trim().toLowerCase();
  const all = Object.keys(fnl).map((key) => ({ key, nl: fnl[key], fr: ffr[key] ?? "", en: fen[key] ?? "" }));
  const missing = all.filter((r) => !r.fr || !r.en).length;
  const rows = all.filter((r) => (!missingOnly || !r.fr || !r.en) && (!query || `${r.key} ${r.nl}`.toLowerCase().includes(query)));
  return { total: all.length, missing, count: rows.length, rows: rows.slice(0, limit) };
}

export async function loadAcademy() {
  await admin();
  const nl = (await appMessages("nl")) as { academy?: { tracks?: { key: string; t: string; lessons: string[] }[]; content?: Record<string, unknown> } } | null;
  const tracks = nl?.academy?.tracks ?? [];
  const content = nl?.academy?.content ?? {};
  return tracks.flatMap((tr, i) =>
    tr.lessons.map((title, j) => ({
      track: `${String(i + 1).padStart(2, "0")} ${tr.t}`,
      lesson: title,
      written: !!content[`${tr.key}-${j + 1}`],
    })),
  );
}
