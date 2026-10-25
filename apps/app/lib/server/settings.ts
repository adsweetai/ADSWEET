import "server-only";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { must, type Connection, type Goal, type Json } from "@adsweet/db";
import { formatDashDate, formatDateTime, formatDayMonth, formatEuro, formatLongDate, formatMonthCode, formatPercent } from "@adsweet/ui";
import { nowIso } from "@/lib/clock";
import { isDemo } from "@/lib/env";
import { DEFAULT_NAMING, namingOf, type Naming } from "@/lib/naming";
import { PLAN_LIMITS, hasPlan } from "@/lib/plans";
import type { SettingsPage } from "@/lib/routes";
import { getDb, serviceDb } from "./auth";
import { inAccount, isLive } from "./campaigns";
import { writeLog } from "./changes";
import { assertCanEdit, getContext, type AppContext } from "./context";
import { goalFor } from "./metrics";
import { chanceToNumber, goalTypeKind, parseNum, readAndSaveWebsite } from "./onboarding";
import { metaStatus } from "./meta/connect";
import { oauthReady } from "./meta/oauth";
import { currentPlaybook } from "./playbook";

// Instellingen (App.dc.html#instellingen-…). Alles wat je hier wijzigt, staat in Supabase: het bedrijfsprofiel,
// je doelen, de naamgeving, wie betaalt, je meldingen en je tijdzone. Abonnement, team en doorverwijzen hebben
// hun eigen module.

/** De tien soorten meldingen, in de volgorde van het prototype. De teksten staan in notifications.types. */
export const NOTIFICATION_TYPES = [
  "kosten_hoger",
  "afgekeurd",
  "betaalprobleem",
  "pixel",
  "buiten_app",
  "vermoeidheid",
  "budget_minimum",
  "koppeling_verlopen",
  "credits_bijna_op",
  "proef_bijna_om",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PROVIDERS = ["meta", "google_ads", "shopify", "google_analytics", "google_drive", "dropbox", "canva", "figma", "slack"] as const;
export const TIMEZONES = ["Europe/Brussels", "Europe/Amsterdam", "Europe/Luxembourg", "Europe/Paris"] as const;

export interface ProfileVM {
  name: string;
  website: string;
  sells: string;
  tone: string;
  region: string;
  diff: string;
  competitors: string;
}

export interface NumbersVM {
  kind: "sales" | "leads" | "none" | "nogoal";
  /** Verliezer bij x keer het doel zonder resultaat (uit het gepubliceerde playbook). */
  loserMultiple: number;
  goalType: Goal["type"] | null;
  aov: string;
  margin: string;
  roas: string;
  cpl: string;
  clv: string;
  lmargin: string;
  chance: string;
}

export interface ConnectionRowVM {
  provider: (typeof PROVIDERS)[number];
  status: Connection["status"] | null;
  since: string | null;
}

export interface AccountRowVM {
  id: string;
  name: string;
  currency: string;
  status: "actief" | "betaalprobleem" | "koppeling_verlopen" | "uitgeschakeld";
  current: boolean;
  aov: string | null;
  margin: string | null;
}

export interface AccountsVM {
  rows: AccountRowVM[];
  add: "agency" | "locked" | "full" | "free";
  used: number;
  max: number;
}

export interface NamingVM {
  naming: Naming;
  sample: {
    campaign: Record<string, string>;
    adSet: Record<string, string | number>;
    ad: Record<string, string>;
    utm: Record<string, string>;
  };
}

export interface PrivacyVM {
  metaConnected: boolean;
  deletionRequested: string | null;
  isOwner: boolean;
  orgName: string;
}

export interface PlaybookVM {
  rules: string[];
  note: string;
}

export type SettingsVM =
  | { sub: "profiel"; profile: ProfileVM }
  | { sub: "cijfers"; numbers: NumbersVM }
  | { sub: "koppelingen"; connections: ConnectionRowVM[]; biz: string; metaLive: boolean; metaConnect: boolean; lastSync: string | null }
  | { sub: "accounts"; accounts: AccountsVM }
  | { sub: "naamgeving"; naming: NamingVM }
  | { sub: "betaler"; payer: { payer: string; beneficiary: string } }
  | { sub: "meldingen"; notifications: { type: NotificationType; on: boolean }[] }
  | { sub: "taal"; language: { locale: string; timezone: string; currency: string } }
  | { sub: "privacy"; privacy: PrivacyVM }
  | { sub: "playbook"; playbook: PlaybookVM }
  | { sub: "ontwikkelaars" };

const pctText = (n: number | null | undefined) => (n ? String(Math.round(Number(n) * 1000) / 10).replace(".", ",") : "");
const numText = (n: number | null | undefined) => (n ? String(Number(n)).replace(".", ",") : "");

export async function loadSettings(ctx: AppContext, sub: Exclude<SettingsPage, "team" | "abonnement" | "doorverwijzen">): Promise<SettingsVM> {
  const db = await getDb();
  const org = ctx.org;
  switch (sub) {
    case "profiel": {
      const bp = must(await db.from("business_profiles").select().eq("organization_id", org.id).maybeSingle());
      return {
        sub,
        profile: {
          name: org.name,
          website: bp?.website ?? "",
          sells: bp?.sells ?? "",
          tone: (bp?.tone ?? []).join(", "),
          region: bp?.region ?? "",
          diff: bp?.differentiator ?? "",
          competitors: (bp?.competitors ?? []).join(", "),
        },
      };
    }
    case "cijfers": {
      const goal = goalFor(must(await db.from("goals").select().eq("organization_id", org.id)), ctx.account?.id);
      const kind = goal ? goalTypeKind(goal) : "nogoal";
      const close = Number(goal?.close_rate ?? 0);
      return {
        sub,
        numbers: {
          kind,
          loserMultiple: (await currentPlaybook()).loserMultiple,
          goalType: goal?.type ?? null,
          aov: numText(goal?.aov),
          margin: pctText(goal?.margin),
          roas: numText(goal?.target_roas),
          cpl: numText(goal?.target_cpl),
          clv: numText(goal?.clv),
          lmargin: pctText(goal?.margin),
          chance: close > 0 ? `1 op ${Math.round(1 / close)}` : "",
        },
      };
    }
    case "koppelingen": {
      const conns = must(await db.from("connections").select().eq("organization_id", org.id));
      const lastSync = (conns.find((c) => c.provider === "meta")?.details as { last_sync?: string } | null)?.last_sync ?? null;
      const meta = await metaStatus(ctx.user.id);
      return {
        sub,
        biz: ctx.account?.name ?? org.name,
        metaLive: meta.live,
        metaConnect: meta.connect,
        lastSync: lastSync ? formatDateTime(lastSync) : null,
        connections: PROVIDERS.map((provider) => {
          const c = conns.filter((x) => x.provider === provider).sort((a, b) => (b.connected_at ?? "").localeCompare(a.connected_at ?? ""))[0];
          let status = c?.status ?? null;
          if (provider === "meta" && status && ctx.demo.state === "koppeling") status = "verlopen";
          return { provider, status, since: c?.connected_at ? formatDayMonth(c.connected_at.slice(0, 10)) : null };
        }),
      };
    }
    case "accounts": {
      const goals = must(await db.from("goals").select().eq("organization_id", org.id));
      const max = PLAN_LIMITS[ctx.plan].accounts;
      const used = ctx.adAccounts.length;
      return {
        sub,
        accounts: {
          rows: ctx.adAccounts.map((a) => {
            const g = goals.find((x) => x.ad_account_id === a.id) ?? (ctx.adAccounts.length === 1 ? goalFor(goals, a.id) : null);
            const sales = g?.type === "verkopen" && g.aov && g.margin;
            return {
              id: a.id,
              name: a.name,
              currency: a.currency,
              status: a.status,
              current: a.id === ctx.account?.id,
              aov: sales ? formatEuro(Number(g.aov)) : null,
              margin: sales ? formatPercent(Number(g.margin)) : null,
            };
          }),
          add: ctx.agency ? "agency" : !hasPlan(ctx.plan, "scale") ? "locked" : used >= max ? "full" : "free",
          used,
          max,
        },
      };
    }
    case "naamgeving":
      return { sub, naming: await namingSample(ctx) };
    case "betaler": {
      const bp = must(await db.from("business_profiles").select("payer, beneficiary").eq("organization_id", org.id).maybeSingle());
      return { sub, payer: { payer: bp?.payer ?? org.name, beneficiary: bp?.beneficiary ?? org.name } };
    }
    case "meldingen": {
      const rows = must(await db.from("notification_settings").select().eq("organization_id", org.id).eq("user_id", ctx.user.id));
      return { sub, notifications: NOTIFICATION_TYPES.map((type) => ({ type, on: rows.find((r) => r.type === type)?.in_app !== false })) };
    }
    case "taal":
      return { sub, language: { locale: ctx.profile.locale, timezone: ctx.profile.timezone, currency: ctx.account?.currency ?? "EUR" } };
    case "privacy": {
      const meta = must(await db.from("connections").select("status").eq("organization_id", org.id).eq("provider", "meta"));
      return {
        sub,
        privacy: {
          metaConnected: meta.some((c) => c.status === "gekoppeld" || c.status === "verlopen"),
          deletionRequested: org.deletion_requested_at ? formatLongDate(org.deletion_requested_at.slice(0, 10)) : null,
          isOwner: ctx.role === "eigenaar",
          orgName: org.name,
        },
      };
    }
    case "playbook":
      return { sub, playbook: await playbookRules() };
    case "ontwikkelaars":
      return { sub };
  }
}

/** De naamgeving met een voorbeeld uit je eigen campagne (of een voorbeeld als je er nog geen hebt). */
async function namingSample(ctx: AppContext): Promise<NamingVM> {
  const t = await getTranslations("wizard");
  const ts = await getTranslations("settings.naming.sample");
  const db = await getDb();
  const naming = namingOf(ctx.org.naming, ctx.org.name);
  const campaigns = must(await db.from("campaigns").select().eq("organization_id", ctx.org.id).eq("outside_adsweet", false));
  const mine = campaigns.filter((c) => inAccount(ctx, c));
  const main = mine.find((c) => c.kind === "vast" && isLive(c)) ?? mine.find(isLive) ?? mine[0] ?? null;
  const [set, ad] = main
    ? await Promise.all([
        db.from("ad_sets").select().eq("campaign_id", main.id).order("start_date").limit(1).maybeSingle().then(must),
        db.from("ads").select().eq("campaign_id", main.id).order("code").limit(1).maybeSingle().then(must),
      ])
    : [null, null];
  const kind = main?.kind ?? "vast";
  const goal = main?.goal ?? "verkopen";
  const start = main?.start_date ?? set?.start_date ?? ctx.org.created_at.slice(0, 10);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const adKind = ad?.kind === "foto" ? "foto" : "video";
  return {
    naming,
    sample: {
      campaign: {
        zaak: naming.short,
        soort: kind === "vast" ? "Vast" : (t.raw(`strategies.${kind}`) as string[])[0],
        doel: (t.raw(`goals.${goal}`) as string[])[0],
        maand: formatMonthCode(start),
      },
      adSet: { n: 1, datum: formatDashDate(set?.start_date ?? start), reden: set?.reason ?? ts("reason") },
      ad: { code: ad?.code ?? "A1", fase: cap(ad?.phase ?? "top"), soort: cap(adKind), naam: ad?.name ?? ts("ad") },
      utm: { zaak: naming.short, soort: kind, doel: goal },
    },
  };
}

/** Het gepubliceerde playbook, in gewone taal. De regels komen uit de laatste versie in playbook_versions. */
export async function playbookRules(): Promise<PlaybookVM> {
  const t = await getTranslations("settings.playbook");
  const r = await currentPlaybook();
  const s = r.startStructure;
  return {
    rules: [
      t("rules.campaign", { n: s.campaigns }),
      t("rules.cbo"),
      t("rules.structure", { sets: s.adSets, ads: s.ads, photos: s.photos, videos: s.videos }),
      t("rules.broad"),
      t("rules.newSet"),
      t("rules.extras"),
      t("rules.min", { min: formatEuro(r.minDailyBudget.default), web: formatEuro(r.minDailyBudget.webshop) }),
      t("rules.loser", { x: r.loserMultiple }),
      t("rules.scale"),
    ],
    note: r.publishedAt
      ? t("note", { version: r.version ?? "1.0", date: formatLongDate(r.publishedAt.slice(0, 10), true) })
      : t("noteNoDate", { version: r.version ?? "1.0" }),
  };
}

/** Meldingen die je in de app uitzette. Die tonen we niet in de bel en niet in Meldingen. */
export async function mutedTypes(ctx: AppContext): Promise<Set<string>> {
  const db = await getDb();
  const rows = must(await db.from("notification_settings").select("type, in_app").eq("organization_id", ctx.org.id).eq("user_id", ctx.user.id));
  return new Set(rows.filter((r) => !r.in_app).map((r) => r.type));
}

// ---------------------------------------------------------------------------
// Bewaren
// ---------------------------------------------------------------------------

async function editable() {
  const ctx = await getContext();
  assertCanEdit(ctx);
  return { ctx, db: await getDb() };
}

const cut = (s: string, n = 500) =>
  String(s ?? "")
    .trim()
    .slice(0, n);
const list = (s: string, max: number) =>
  cut(s, 1000)
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);

export async function saveBusinessProfile(input: ProfileVM): Promise<{ ok: boolean; error?: "name" }> {
  const { ctx, db } = await editable();
  const name = cut(input.name, 80);
  if (!name) return { ok: false, error: "name" };
  const website = cut(input.website, 200)
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  const row = {
    website: website || null,
    sells: cut(input.sells) || null,
    tone: list(input.tone, 5),
    region: cut(input.region, 200) || null,
    differentiator: cut(input.diff) || null,
    competitors: list(input.competitors, 10),
    updated_at: nowIso(),
  };
  const has = must(await db.from("business_profiles").select("organization_id").eq("organization_id", ctx.org.id).maybeSingle());
  if (has) await db.from("business_profiles").update(row).eq("organization_id", ctx.org.id);
  else await db.from("business_profiles").insert({ organization_id: ctx.org.id, ...row });
  if (name !== ctx.org.name) {
    const naming = { ...((ctx.org.naming ?? {}) as Record<string, Json>), short: name.split(/[,|·]/)[0].trim() };
    await db.from("organizations").update({ name, naming }).eq("id", ctx.org.id);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rereadWebsite(): Promise<{ ok: boolean; error?: "site" | "read" }> {
  const { ctx, db } = await editable();
  const bp = must(await db.from("business_profiles").select("website").eq("organization_id", ctx.org.id).maybeSingle());
  if (!bp?.website) return { ok: false, error: "site" };
  const res = await readAndSaveWebsite(bp.website);
  return res.ok ? { ok: true } : { ok: false, error: "read" };
}

export async function saveNumbers(input: {
  aov: string;
  margin: string;
  roas: string;
  cpl: string;
  clv: string;
  lmargin: string;
  chance: string;
}): Promise<{ ok: boolean; error?: "sales" | "leads" | "goal" }> {
  const { ctx, db } = await editable();
  const goal = goalFor(must(await db.from("goals").select().eq("organization_id", ctx.org.id)), ctx.account?.id);
  if (!goal) return { ok: false, error: "goal" };
  const kind = goalTypeKind(goal);
  const frac = (s: string) => {
    const n = parseNum(s);
    return n > 1 ? n / 100 : n;
  };
  let update: Partial<Goal> = {};
  if (kind === "sales") {
    const aov = parseNum(input.aov);
    const margin = frac(input.margin);
    if (!(aov > 0) || !(margin > 0.01 && margin < 0.99)) return { ok: false, error: "sales" };
    update = { aov, margin, target_roas: parseNum(input.roas) || null };
  } else if (kind === "leads") {
    const cpl = parseNum(input.cpl);
    const clv = parseNum(input.clv);
    const margin = frac(input.lmargin);
    const close = chanceToNumber(input.chance);
    if (!(cpl > 0) && !(clv > 0 && margin > 0 && close > 0)) return { ok: false, error: "leads" };
    update = {
      target_cpl: cpl || null,
      clv: clv || null,
      margin: margin > 0 && margin < 1 ? margin : null,
      close_rate: close > 0 && close <= 1 ? close : null,
    };
  }
  await db
    .from("goals")
    .update({ ...update, updated_at: nowIso() })
    .eq("id", goal.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveNaming(input: Omit<Naming, "short">): Promise<{ ok: boolean }> {
  const { ctx, db } = await editable();
  const clean = {
    campaign: cut(input.campaign, 200),
    ad_set: cut(input.ad_set, 200),
    ad: cut(input.ad, 200),
    utm: cut(input.utm, 400),
  };
  if (!clean.campaign || !clean.ad_set || !clean.ad || !clean.utm) return { ok: false };
  const current = namingOf(ctx.org.naming, ctx.org.name);
  const naming: Record<string, Json> = { ...((ctx.org.naming ?? {}) as Record<string, Json>), short: current.short };
  for (const k of Object.keys(DEFAULT_NAMING) as (keyof typeof DEFAULT_NAMING)[]) naming[k] = clean[k];
  await db.from("organizations").update({ naming }).eq("id", ctx.org.id);
  return { ok: true };
}

export async function savePayer(input: { payer: string; beneficiary: string }): Promise<{ ok: boolean }> {
  const { ctx, db } = await editable();
  const payer = cut(input.payer, 120);
  const beneficiary = cut(input.beneficiary, 120);
  if (!payer || !beneficiary) return { ok: false };
  await db.from("business_profiles").update({ payer, beneficiary, updated_at: nowIso() }).eq("organization_id", ctx.org.id);
  return { ok: true };
}

/** Meldingen staan per gebruiker: in de app en per mail samen aan of uit. */
export async function setNotification(type: string, on: boolean) {
  const ctx = await getContext();
  if (!NOTIFICATION_TYPES.includes(type as NotificationType)) return;
  const db = await getDb();
  await db
    .from("notification_settings")
    .upsert({ organization_id: ctx.org.id, user_id: ctx.user.id, type, in_app: on, email: on }, { onConflict: "organization_id,user_id,type" });
  revalidatePath("/", "layout");
}

export async function saveTimezone(tz: string) {
  const ctx = await getContext();
  if (!TIMEZONES.includes(tz as (typeof TIMEZONES)[number])) return;
  const db = await getDb();
  await db.from("profiles").update({ timezone: tz }).eq("user_id", ctx.user.id);
}

export async function disconnectMeta() {
  const { ctx, db } = await editable();
  const t = await getTranslations("settings.connections");
  await db.from("connections").update({ status: "los" }).eq("organization_id", ctx.org.id).eq("provider", "meta");
  await writeLog(db, ctx, { kind: "wijziging", what: t("disconnected") });
  revalidatePath("/", "layout");
}

/** Opnieuw koppelen. In de demo meteen in orde; anders via het venster van Meta (Supabase Auth, tokens in fase 13). */
export async function reconnectMeta(): Promise<{ ok: true } | { ok: false; href: string }> {
  const { ctx, db } = await editable();
  // Online: "Doorgaan met Facebook" voor de koppeling (of, zonder Meta-app, inloggen met Facebook).
  if (!isDemo) return { ok: false, href: oauthReady() ? "/auth/meta?next=/instellingen/koppelingen" : "/auth/facebook?next=/instellingen/koppelingen" };
  const t = await getTranslations("settings.connections");
  const has = must(await db.from("connections").select("id").eq("organization_id", ctx.org.id).eq("provider", "meta"));
  if (has.length) await db.from("connections").update({ status: "gekoppeld", connected_at: nowIso() }).eq("organization_id", ctx.org.id).eq("provider", "meta");
  else
    await db
      .from("connections")
      .insert({ organization_id: ctx.org.id, ad_account_id: ctx.account?.id ?? null, provider: "meta", status: "gekoppeld", connected_at: nowIso() });
  await writeLog(db, ctx, { kind: "wijziging", what: t("reconnected") });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Verwijderverzoek: alleen de eigenaar. AdSweet verwijdert binnen [termijn]; tot dan kan je het intrekken. */
export async function requestDeletion(on: boolean): Promise<{ ok: boolean }> {
  const ctx = await getContext();
  if (ctx.role !== "eigenaar" || ctx.inClient) return { ok: false };
  await serviceDb()
    .from("organizations")
    .update({ deletion_requested_at: on ? nowIso() : null })
    .eq("id", ctx.org.id);
  return { ok: true };
}

/** Alles wat AdSweet over de zaak bewaart, als JSON. Voor de eigenaar en beheerders. */
export async function exportData(ctx: AppContext) {
  assertCanEdit(ctx);
  const db = await getDb();
  const org = ctx.org.id;
  const tables = [
    "business_profiles",
    "goals",
    "ad_accounts",
    "campaigns",
    "ad_sets",
    "ads",
    "documents",
    "media",
    "log_entries",
    "notifications",
    "recommendations",
    "rules",
    "autopilot_settings",
  ] as const;
  const out: Record<string, unknown> = { exported_at: nowIso(), organization: ctx.org };
  for (const table of tables) out[table] = must(await db.from(table).select().eq("organization_id", org));
  return out;
}
