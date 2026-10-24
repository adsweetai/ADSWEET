import "server-only";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { must, type FunnelPhase, type Goal, type Json, type Plan, type SeriesColor, type Targeting } from "@adsweet/db";
import { breakEvenRoas, leadMax, maxCostPerSale } from "@adsweet/playbook";
import { formatDayMonth, formatDashDate, formatEuro, formatMonthCode } from "@adsweet/ui";
import { addDays, nowIso, today } from "@/lib/clock";
import { isDemo } from "@/lib/env";
import { TRIAL_CREDITS, TRIAL_DAYS, hasAI } from "@/lib/plans";
import { currentUser, getDb, serviceDb } from "./auth";
import { mediaUrl, slugify } from "./campaigns";
import { writeLog } from "./changes";
import { ORG_COOKIE, assertCanEdit, getContext, type AppContext } from "./context";
import { demoSiteOf, type Brief } from "./demo-sites";
import { minDailyBudget } from "./playbook";
import { recordReferral } from "./referral";
import { readWebsite, type Found } from "./website";

// De onboarding: van een nieuw account naar een eerste campagne in ongeveer 10 minuten (Inloggen.dc.html#onboarding-1…11).
// Alles wordt per stap bewaard; je kan stoppen en later verdergaan.

export const STEP_COUNT = 11;
const EXISTING_KEY = "bestaande_campagnes";

/** Stap 7 (je bestaande advertenties) bestaat alleen als het advertentieaccount al campagnes heeft. */
export const stepsFor = (existing: boolean) => Array.from({ length: STEP_COUNT }, (_, i) => i + 1).filter((n) => n !== 7 || existing);

// ---------------------------------------------------------------------------
// Begin: de organisatie van een nieuwe klant
// ---------------------------------------------------------------------------

/** Maakt de organisatie aan voor een nieuwe gebruiker zonder organisatie. Met de service role, na controle van de sessie. */
export async function createOwnOrganization(userId?: string): Promise<string | null> {
  const user = userId ? { id: userId } : await currentUser();
  if (!user) return null;
  const svc = serviceDb();
  const existing = must(await svc.from("members").select("organization_id").eq("user_id", user.id));
  if (existing.length) return existing[0].organization_id;
  const t = await getTranslations("onboarding");
  const name = t("newOrgName");
  const org = must(
    await svc
      .from("organizations")
      .insert({
        name,
        kind: "zelfstandige",
        plan: "pro",
        subscription_status: "proef",
        color: "roos",
        onboarding_step: 1,
        onboarding_done: false,
        tuning_step: 1,
        naming: { short: name, utm_source: "meta", utm_medium: "paid_social" },
      })
      .select()
      .single(),
  );
  await svc.from("members").insert({ user_id: user.id, organization_id: org.id, role: "eigenaar" });
  await svc.from("business_profiles").insert({ organization_id: org.id });
  const who = must(await svc.from("profiles").select("first_name, email").eq("user_id", user.id).maybeSingle());
  await recordReferral(org.id, who?.first_name || who?.email || name);
  try {
    (await cookies()).set(ORG_COOKIE, org.id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  } catch {
    // Tijdens het tonen van een pagina mag dat niet; zonder cookie kiest de app je enige organisatie.
  }
  return org.id;
}

// ---------------------------------------------------------------------------
// Gegevens voor de schermen
// ---------------------------------------------------------------------------

export interface Slot {
  id: string | null;
  code: string;
  phase: FunnelPhase;
  kind: "foto" | "video";
  mediaId: string | null;
  mediaName: string | null;
  mediaUrl: string | null;
  text: string;
  headline: string;
  cta: string;
}

export interface OnboardingVM {
  step: number;
  steps: number[];
  reached: number;
  firstName: string;
  orgName: string;
  color: SeriesColor;
  headline: string;
  short: string;
  site: string;
  found: (Omit<Found, "demo"> & { imagesCount: number }) | null;
  profile: { name: string; sells: string; tone: string; contact: string; differentiator: string; bestCustomers: string; competitors: string };
  images: { id: string; name: string; url: string | null; kind: "foto" | "video"; source: string }[];
  goal: {
    type: Goal["type"] | null;
    zaakMode: "aanvragen" | "bekendheid";
    area: "radius" | "prov" | "land";
    areaValue: string;
    radius: number;
    countries: string;
    languages: string;
    age: string;
    special: boolean;
    aov: string;
    margin: string;
    targetRoas: string;
    cpl: string;
    clv: string;
    lmargin: string;
    chance: string;
  };
  offers: { name: string; price: string }[];
  meta: null | { page: string; ig: string; account: string; pixel: string; pixelOk: boolean; existing: boolean };
  payer: string;
  beneficiary: string;
  briefs: Brief[];
  moments: string[];
  budget: { suggested: number; min: number };
  draft: null | { campaignId: string; budget: number; slots: Slot[]; status: string };
  billing: { plan: Plan; period: "maandelijks" | "jaarlijks"; name: string; vat: string; address: string; email: string; paid: boolean; founding: boolean };
  trialEnd: string;
  hasAI: boolean;
  demo: boolean;
}

const pct = (n: number | null | undefined) => (n ? `${Math.round(n * 100)}%` : "");
const money = (n: number | null | undefined) => (n ? formatEuro(n) : "");

/** Een kans als "1 op 4" (of 25%). */
export function chanceToNumber(s: string): number {
  const m = /(\d+)\s*op\s*(\d+)/i.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  const p = Number(s.replace("%", "").replace(",", ".")) || 0;
  return p > 1 ? p / 100 : p;
}
const chanceText = (n: number) => (Number.isInteger(Math.round((1 / n) * 1000) / 1000) ? `1 op ${Math.round(1 / n)}` : pct(n));

/** Bedrag of percentage uit een veld: "€58", "40%", "2,5". */
export const parseNum = (s: string) =>
  Number(
    String(s)
      .replace(/[€%\s]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  ) || 0;

export async function loadOnboarding(ctx: AppContext, step: number): Promise<OnboardingVM> {
  const t = await getTranslations("onboarding");
  const db = await getDb();
  const [bp, goals, conns, accounts, media, campaigns] = await Promise.all([
    db.from("business_profiles").select().eq("organization_id", ctx.org.id).maybeSingle().then(must),
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("connections").select().eq("organization_id", ctx.org.id).eq("provider", "meta").then(must),
    db.from("ad_accounts").select().eq("organization_id", ctx.org.id).order("sort").then(must),
    db.from("media").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
    db.from("campaigns").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
  ]);
  const goal = goals.find((g) => !g.ad_account_id) ?? goals[0] ?? null;
  const tgt: Targeting = goal?.targeting ?? {};
  const conn = conns[0] ?? null;
  const details = (conn?.details ?? {}) as Record<string, Json>;
  const existing = !!details[EXISTING_KEY];
  const demo = demoSiteOf(bp?.website);
  const f = (bp?.found ?? {}) as Partial<Found> & { imageCount?: number };
  const kind = goalTypeKind(goal);
  const min = await minDailyBudget(kind === "sales" && ctx.org.kind === "webshop");
  const draftCampaign = campaigns.find((c) => !c.outside_adsweet) ?? null;
  let draft: OnboardingVM["draft"] = null;
  if (draftCampaign) {
    const ads = must(await db.from("ads").select().eq("campaign_id", draftCampaign.id));
    draft = {
      campaignId: draftCampaign.id,
      budget: draftCampaign.daily_budget ?? min,
      status: draftCampaign.status,
      slots: ads
        .sort((a, b) => a.code.localeCompare(b.code, "nl", { numeric: true }))
        .map((a) => {
          const m = media.find((x) => x.id === a.media_id);
          return {
            id: a.id,
            code: a.code,
            phase: a.phase,
            kind: a.kind,
            mediaId: a.media_id,
            mediaName: m?.name ?? null,
            mediaUrl: m ? mediaUrl(m.id, m.storage_path) : null,
            text: a.primary_text ?? "",
            headline: a.headline ?? "",
            cta: a.cta ?? "",
          };
        }),
    };
  }
  const reached = Math.max(ctx.org.onboarding_step, step);
  const day = today();
  const briefs = demo?.briefs ?? (t.raw("briefs") as Brief[]);
  return {
    step,
    steps: stepsFor(existing),
    reached,
    firstName: ctx.profile.first_name ?? "",
    orgName: ctx.org.name,
    color: ctx.org.color,
    headline: demo?.headline ?? (f.name || ctx.org.name),
    short: ((ctx.org.naming ?? {}) as { short?: string }).short ?? ctx.org.name,
    site: bp?.website ?? "",
    found: bp?.website && f.name ? { ...(f as Found), imagesCount: f.imageCount ?? media.filter((m) => m.source === "website").length } : null,
    profile: {
      name: ctx.org.name === t("newOrgName") ? "" : ctx.org.name,
      sells: [bp?.sells, bp?.offers?.length ? bp.offers.map((o) => `${o.name} ${o.price}`).join(" · ") : null].filter(Boolean)[0] ?? "",
      tone: (bp?.tone ?? []).join(", "),
      contact: [(bp?.contact as { text?: string } | undefined)?.text, bp?.region].filter(Boolean)[0] ?? "",
      differentiator: bp?.differentiator ?? "",
      bestCustomers: bp?.best_customers ?? "",
      competitors: (bp?.competitors ?? []).join(", "),
    },
    images: media.map((m) => ({ id: m.id, name: m.name ?? "", url: mediaUrl(m.id, m.storage_path), kind: m.kind, source: m.source })),
    goal: {
      type: goal?.type ?? null,
      zaakMode: goal?.zaak_mode === "bekendheid" ? "bekendheid" : "aanvragen",
      area: tgt.area ?? "radius",
      areaValue: tgt.region ?? demo?.found.region ?? "",
      radius: tgt.radius_km ?? 15,
      countries: (tgt.countries ?? [t("belgium")]).join(", "),
      languages: (tgt.languages ?? [t("dutch")]).join(", "),
      age: tgt.age_max === undefined && tgt.age_min === undefined ? t("ageDefault") : ageText(tgt, t),
      special: !!goal?.special_category,
      aov: money(goal?.aov) || (demo?.numbers.aov ?? ""),
      margin: (kind === "sales" ? pct(goal?.margin) : "") || (demo?.numbers.margin ?? ""),
      targetRoas: goal?.target_roas ? String(goal.target_roas).replace(".", ",") : "",
      cpl: goal?.target_cpl ? String(goal.target_cpl).replace(".", ",") : (demo?.numbers.cpl ?? ""),
      clv: money(goal?.clv) || (demo?.numbers.clv ?? ""),
      lmargin: (kind !== "sales" ? pct(goal?.margin) : "") || (demo?.numbers.lmargin ?? ""),
      chance: goal?.close_rate ? chanceText(goal.close_rate) : (demo?.numbers.chance ?? ""),
    },
    offers: bp?.offers ?? [],
    meta:
      conn && accounts[0]
        ? {
            page: conn.page_name ?? ctx.org.name,
            ig: conn.ig_name ?? "",
            account: `${accounts[0].name} · ${accounts[0].meta_ad_account_id ?? "[nummer]"} · ${accounts[0].currency} · ${accounts[0].status === "actief" ? t("active") : accounts[0].status}`,
            pixel: conn.pixel_name ?? "",
            pixelOk: !!conn.pixel_ok,
            existing,
          }
        : null,
    payer: bp?.payer ?? ctx.org.name,
    beneficiary: bp?.beneficiary ?? ctx.org.name,
    briefs,
    moments: demo?.moments ?? momentsFrom(day, t.raw("moments") as Record<string, string>),
    budget: { suggested: demo?.budget ?? min, min },
    draft,
    billing: {
      plan: ctx.org.plan === "agency" ? "scale" : ctx.org.plan,
      period: ctx.org.billing_period,
      name: ctx.org.billing_name ?? ctx.org.name,
      vat: ctx.org.billing_vat ?? "",
      address: ctx.org.billing_address ?? "",
      email: ctx.org.billing_email ?? ctx.user.email,
      paid: !!ctx.org.trial_started_at,
      founding: ctx.org.founding,
    },
    trialEnd: formatDayMonth(ctx.org.trial_ends_at ?? addDays(day, TRIAL_DAYS)),
    hasAI: hasAI(ctx.plan),
    demo: isDemo,
  };
}

function ageText(tgt: Targeting, t: Awaited<ReturnType<typeof getTranslations>>) {
  return tgt.age_max === null || tgt.age_max === undefined
    ? t("agePlus", { min: tgt.age_min ?? 18 })
    : t("ageRange", { min: tgt.age_min ?? 18, max: tgt.age_max });
}

type GoalKind = "sales" | "leads" | "none";
export function goalTypeKind(goal: Pick<Goal, "type" | "zaak_mode"> | null): GoalKind {
  if (!goal) return "none";
  if (goal.type === "verkopen") return "sales";
  if (goal.type === "aanvragen" || (goal.type === "zaak" && goal.zaak_mode !== "bekendheid")) return "leads";
  return "none";
}

/** Momenten in de komende drie maanden, uit de vaste kalender in nl.json (sleutel = maand). */
export function momentsFrom(day: string, table: Record<string, string>) {
  const month = Number(day.slice(5, 7));
  return [0, 1, 2].map((i) => ((month - 1 + i) % 12) + 1).flatMap((m) => (table[String(m)] ? [table[String(m)]] : []));
}

// ---------------------------------------------------------------------------
// Bewaren per stap
// ---------------------------------------------------------------------------

async function own() {
  const ctx = await getContext();
  assertCanEdit(ctx);
  if (ctx.role !== "eigenaar") throw new Error("Alleen de eigenaar doet de onboarding.");
  return { ctx, db: await getDb() };
}

export async function setReached(step: number) {
  const { ctx, db } = await own();
  const n = Math.min(STEP_COUNT, Math.max(1, Math.round(step)));
  if (n > ctx.org.onboarding_step) await db.from("organizations").update({ onboarding_step: n }).eq("id", ctx.org.id);
}

export async function saveWelcome(name: string) {
  const { ctx, db } = await own();
  const clean = name.trim().slice(0, 60);
  if (clean) await db.from("profiles").update({ first_name: clean }).eq("user_id", ctx.user.id);
}

/** Leest de website en bewaart wat gevonden is in het bedrijfsprofiel. */
export async function readAndSaveWebsite(site: string): Promise<{ ok: true; found: Omit<Found, "demo"> } | { ok: false }> {
  const { ctx, db } = await own();
  const found = await readWebsite(site);
  if (!found) return { ok: false };
  const { demo, ...rest } = found;
  void demo;
  await db
    .from("business_profiles")
    .update({
      website: found.site,
      sells: found.sells || null,
      offers: found.offers,
      tone: found.tone,
      tone_example: found.toneExample,
      colors: found.colors,
      region: found.region,
      contact: { text: found.contact },
      found: rest as unknown as Json,
      updated_at: nowIso(),
    })
    .eq("organization_id", ctx.org.id);
  await renameOrg(ctx, found.name);
  // Beelden van de website komen in de bibliotheek (zonder kopie: in fase 13 halen we ze op).
  const already = must(await db.from("media").select("id").eq("organization_id", ctx.org.id).eq("source", "website"));
  if (!already.length) {
    const names = found.images.length
      ? found.images.map((u) => decodeURIComponent(u.split("/").pop()?.split("?")[0] ?? "beeld").slice(0, 120))
      : Array.from({ length: found.imageCount }, (_, i) => `website-beeld-${i + 1}.jpg`);
    if (names.length)
      await db.from("media").insert(
        names.map((name) => ({
          organization_id: ctx.org.id,
          name,
          kind: /\.(mp4|mov|webm)$/i.test(name) ? ("video" as const) : ("foto" as const),
          source: "website" as const,
        })),
      );
  }
  return { ok: true, found: rest };
}

async function renameOrg(ctx: AppContext, name: string) {
  const clean = name.trim().slice(0, 80);
  if (!clean) return;
  const naming = { ...((ctx.org.naming ?? {}) as Record<string, Json>), short: clean.split(/[,|·]/)[0].trim() };
  await serviceDb().from("organizations").update({ name: clean, naming }).eq("id", ctx.org.id);
}

export async function saveManual(input: { name: string; sells: string; prices: string; audience: string; region: string; style: string }) {
  const { ctx, db } = await own();
  const site = (await db.from("business_profiles").select("website").eq("organization_id", ctx.org.id).maybeSingle().then(must))?.website ?? null;
  await db
    .from("business_profiles")
    .update({
      website: site,
      sells: [input.sells, input.prices].filter(Boolean).join(" · ") || null,
      audience: input.audience || null,
      region: input.region || null,
      tone: input.style
        ? input.style
            .split(/[,;]/)
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
      found: { name: input.name, manual: true },
      updated_at: nowIso(),
    })
    .eq("organization_id", ctx.org.id);
  await renameOrg(ctx, input.name);
}

export async function saveProfile(input: {
  name: string;
  sells: string;
  tone: string;
  contact: string;
  differentiator: string;
  bestCustomers: string;
  competitors: string;
}) {
  const { ctx, db } = await own();
  const cut = (s: string, n = 500) => s.trim().slice(0, n);
  await db
    .from("business_profiles")
    .update({
      sells: cut(input.sells) || null,
      tone: input.tone
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 5),
      contact: { text: cut(input.contact, 200) },
      differentiator: cut(input.differentiator) || null,
      best_customers: cut(input.bestCustomers) || null,
      competitors: input.competitors
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 10),
      updated_at: nowIso(),
    })
    .eq("organization_id", ctx.org.id);
  await renameOrg(ctx, input.name);
}

export async function removeMedia(id: string) {
  const { ctx, db } = await own();
  await db.from("media").delete().eq("id", id).eq("organization_id", ctx.org.id);
}

const KIND_OF_GOAL: Record<Goal["type"], "webshop" | "dienstverlener" | "lokaal" | "zelfstandige"> = {
  verkopen: "webshop",
  aanvragen: "dienstverlener",
  zaak: "lokaal",
  anders: "zelfstandige",
};

export async function saveGoal(input: {
  type: Goal["type"];
  zaakMode: "aanvragen" | "bekendheid";
  area: "radius" | "prov" | "land";
  areaValue: string;
  radius: number;
  countries: string;
  languages: string;
  age: string;
  special: boolean;
}) {
  const { ctx, db } = await own();
  if (!["verkopen", "aanvragen", "zaak", "anders"].includes(input.type)) return { ok: false };
  const ages = input.age.match(/\d+/g)?.map(Number) ?? [];
  const targeting: Targeting = {
    area: input.area,
    region: input.areaValue.trim().slice(0, 120) || undefined,
    radius_km: input.area === "radius" ? Math.min(80, Math.max(input.special ? 25 : 1, Math.round(input.radius))) : undefined,
    countries: input.countries
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    languages: input.languages
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    age_min: input.special ? 18 : (ages[0] ?? 18),
    age_max: input.special || /\+/.test(input.age) || ages.length < 2 ? null : ages[1],
  };
  const row = {
    type: input.type,
    zaak_mode: input.type === "zaak" ? input.zaakMode : null,
    targeting,
    special_category: input.special,
    updated_at: nowIso(),
  };
  const existing = must(await db.from("goals").select("id").eq("organization_id", ctx.org.id).is("ad_account_id", null).maybeSingle());
  if (existing) await db.from("goals").update(row).eq("id", existing.id);
  else await db.from("goals").insert({ organization_id: ctx.org.id, ...row });
  await serviceDb().from("organizations").update({ kind: KIND_OF_GOAL[input.type] }).eq("id", ctx.org.id);
  return { ok: true };
}

export async function saveNumbers(input: { aov: string; margin: string; targetRoas: string; cpl: string; clv: string; lmargin: string; chance: string }) {
  const { ctx, db } = await own();
  const goal = must(await db.from("goals").select().eq("organization_id", ctx.org.id).is("ad_account_id", null).maybeSingle());
  if (!goal) return { ok: false };
  const kind = goalTypeKind(goal);
  const frac = (s: string) => {
    const n = parseNum(s);
    return n > 1 ? n / 100 : n || null;
  };
  const update =
    kind === "sales"
      ? { aov: parseNum(input.aov) || null, margin: frac(input.margin), target_roas: parseNum(input.targetRoas) || null, target_cpl: null }
      : kind === "leads"
        ? {
            target_cpl: parseNum(input.cpl) || null,
            clv: parseNum(input.clv) || null,
            margin: frac(input.lmargin),
            close_rate: chanceToNumber(input.chance) || null,
          }
        : {};
  await db
    .from("goals")
    .update({ ...update, updated_at: nowIso() })
    .eq("id", goal.id);
  return { ok: true };
}

/** Rekenkaart van stap 5, in gewone taal. */
export async function calcTexts(aov: number, margin: number, clv: number, lmargin: number, chance: number) {
  const t = await getTranslations("onboarding");
  const be = margin > 0 ? breakEvenRoas(margin) : 0;
  return {
    sales:
      margin > 0 && aov > 0
        ? t("calcSales", {
            m: `${Math.round(margin * 100)}%`,
            be: String(Math.round(be * 100) / 100).replace(".", ","),
            per: formatEuro(be, 2),
            max: formatEuro(maxCostPerSale(aov, margin), 2),
          })
        : "",
    leads: clv > 0 && lmargin > 0 && chance > 0 ? t("calcLeads", { x: formatEuro(Math.round(leadMax(clv, lmargin, chance) * 100) / 100) }) : "",
  };
}

export type MetaOutcome = "ok" | "ok_bestaand" | "perm" | "noacc" | "expired";

/**
 * Demo: wat Meta teruggeeft na het venster. Met "Toegang gegeven" maken we het advertentieaccount, de pagina,
 * Instagram en de pixel aan zoals Meta ze zou doorgeven. De echte koppeling volgt in fase 13.
 */
export async function connectMetaDemo(outcome: MetaOutcome): Promise<{ ok: boolean; error?: MetaOutcome }> {
  const { ctx, db } = await own();
  if (!isDemo) return { ok: false, error: "perm" };
  if (outcome !== "ok" && outcome !== "ok_bestaand") return { ok: false, error: outcome };
  const svc = serviceDb();
  const accounts = must(await db.from("ad_accounts").select().eq("organization_id", ctx.org.id));
  const goal = must(await db.from("goals").select().eq("organization_id", ctx.org.id).is("ad_account_id", null).maybeSingle());
  const name = ctx.org.name;
  const acc =
    accounts[0] ??
    must(
      await svc
        .from("ad_accounts")
        .insert({
          organization_id: ctx.org.id,
          name,
          meta_ad_account_id: "[nummer]",
          currency: "EUR",
          status: "actief",
          payment_method_ok: true,
          channel: "meta",
          sort: 0,
        })
        .select()
        .single(),
    );
  const existing = must(await db.from("connections").select("id").eq("organization_id", ctx.org.id).eq("provider", "meta").maybeSingle());
  const row = {
    organization_id: ctx.org.id,
    ad_account_id: acc.id,
    provider: "meta" as const,
    status: "gekoppeld" as const,
    connected_at: nowIso(),
    page_name: name,
    ig_name: `@${slugify(name).replace(/-/g, "")}`,
    pixel_name: goalTypeKind(goal) === "none" ? null : `${name} pixel`,
    // In het prototype meet de pixel van een webshop verkopen; die van een lokale zaak nog niets.
    pixel_ok: ctx.org.kind === "webshop",
    details: { [EXISTING_KEY]: outcome === "ok_bestaand" },
  };
  if (existing) await svc.from("connections").update(row).eq("id", existing.id);
  else await svc.from("connections").insert(row);
  return { ok: true };
}

export async function savePayer(payer: string, beneficiary: string) {
  const { ctx, db } = await own();
  await db
    .from("business_profiles")
    .update({ payer: payer.trim().slice(0, 120) || ctx.org.name, beneficiary: beneficiary.trim().slice(0, 120) || ctx.org.name })
    .eq("organization_id", ctx.org.id);
}

/** Stap 9 · Keur goed: de eerste campagne als concept (nog niet naar Meta). */
export async function saveFirstCampaign(input: {
  budget: number;
  accepted: boolean;
  slots: { phase: FunnelPhase; kind: "foto" | "video"; mediaId: string | null; text: string; headline: string; cta: string }[];
}) {
  const { ctx, db } = await own();
  const goal = must(await db.from("goals").select().eq("organization_id", ctx.org.id).is("ad_account_id", null).maybeSingle());
  const kind = goalTypeKind(goal);
  const min = await minDailyBudget(kind === "sales" && ctx.org.kind === "webshop");
  const budget = Math.round(Number(input.budget) * 100) / 100;
  if (!(budget > 0) || (budget < min && !input.accepted)) return { ok: false as const, error: "budget" };
  const [acc, bp] = await Promise.all([
    db.from("ad_accounts").select().eq("organization_id", ctx.org.id).order("sort").limit(1).maybeSingle().then(must),
    db.from("business_profiles").select().eq("organization_id", ctx.org.id).maybeSingle().then(must),
  ]);
  const t = await getTranslations("campaign.goals");
  const goalName = goal?.type === "verkopen" ? "verkopen" : kind === "leads" ? "aanvragen" : "bereik";
  const start = addDays(today(), 1);
  const short = ((ctx.org.naming ?? {}) as { short?: string }).short ?? ctx.org.name;
  const name = `${short} · Vast · ${t(goalName)} · ${formatMonthCode(start)}`;
  const found = must(
    await db.from("campaigns").select().eq("organization_id", ctx.org.id).eq("outside_adsweet", false).order("created_at").limit(1).maybeSingle(),
  );
  const values = {
    organization_id: ctx.org.id,
    ad_account_id: acc?.id ?? null,
    name,
    kind: "vast" as const,
    goal: goalName as "verkopen" | "aanvragen" | "bereik",
    channel: "meta" as const,
    status: "concept" as const,
    daily_budget: budget,
    budget_level: "campagne" as const,
    start_date: start,
    deviations: budget < min ? ["budget onder het minimum"] : [],
    targeting: goal?.targeting ?? {},
    extras_off: true,
    payer: bp?.payer ?? ctx.org.name,
    beneficiary: bp?.beneficiary ?? ctx.org.name,
    utm: { source: "meta", medium: "paid_social", campaign: `${slugify(short)}-vast-${goalName}` },
    created_by: ctx.user.id,
  };
  const campaign = found
    ? must(await db.from("campaigns").update(values).eq("id", found.id).select().single())
    : must(await db.from("campaigns").insert(values).select().single());
  // Ad set en advertenties opnieuw opbouwen: het is nog een concept.
  await db.from("ads").delete().eq("campaign_id", campaign.id);
  await db.from("ad_sets").delete().eq("campaign_id", campaign.id);
  const adSet = must(
    await db
      .from("ad_sets")
      .insert({
        organization_id: ctx.org.id,
        campaign_id: campaign.id,
        name: `AS1 · ${formatDashDate(start)} · start`,
        reason: "start",
        start_date: start,
        learning: true,
        locked: false,
        status: "concept",
      })
      .select()
      .single(),
  );
  const media = must(await db.from("media").select("id").eq("organization_id", ctx.org.id));
  const ok = new Set(media.map((m) => m.id));
  await db.from("ads").insert(
    input.slots.slice(0, 10).map((s, i) => ({
      organization_id: ctx.org.id,
      campaign_id: campaign.id,
      ad_set_id: adSet.id,
      media_id: s.mediaId && ok.has(s.mediaId) ? s.mediaId : null,
      code: `A${i + 1}`,
      name: (s.text || `A${i + 1}`).replace(/[“”"]/g, "").slice(0, 60),
      kind: s.kind,
      phase: s.phase,
      primary_text: s.text.slice(0, 2000) || null,
      headline: s.headline.slice(0, 255) || null,
      cta: s.cta.slice(0, 60) || null,
      variants: s.text ? { primary_text: [s.text.slice(0, 2000)] } : {},
      extras: { muziek: false, tekst_op_beeld: false, beelduitbreiding: false, varianten: false },
      status: "concept" as const,
      review_status: "wordt_nagekeken" as const,
    })),
  );
  return { ok: true as const, id: campaign.id };
}

const PRICES: Record<"starter" | "pro" | "scale", { month: number; yearMonth: number; year: number }> = {
  starter: { month: 99, yearMonth: 82.5, year: 990 },
  pro: { month: 195, yearMonth: 162.5, year: 1950 },
  scale: { month: 299, yearMonth: 249.17, year: 2990 },
};
export const planPrices = () => PRICES;

/** Een kortingscode nakijken (founding members, partners, doorverwijzing). */
export async function checkCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (clean.length < 4) return null;
  const row = must(await serviceDb().from("discount_codes").select().eq("code", clean).eq("active", true).maybeSingle());
  if (!row || (row.max_uses !== null && row.uses >= row.max_uses)) return null;
  return { code: row.code, kind: row.kind, percent: row.percent_off ?? 0, monthsFree: row.months_free ?? 0 };
}

/**
 * Demo: de betaling is geslaagd. De proefperiode loopt 30 dagen, met hoogstens 50 AI-credits. De echte betaalpagina
 * (Mollie of Stripe) volgt in fase 13; tot dan kan dit alleen in de demomodus.
 */
export async function startTrialDemo(input: {
  plan: "starter" | "pro" | "scale";
  period: "maandelijks" | "jaarlijks";
  code: string;
  billing: { name: string; vat: string; address: string; email: string };
}) {
  const { ctx } = await own();
  if (!isDemo) return { ok: false as const };
  if (!["starter", "pro", "scale"].includes(input.plan)) return { ok: false as const };
  const code = input.code ? await checkCode(input.code) : null;
  const svc = serviceDb();
  const day = today();
  const cut = (s: string) => s.trim().slice(0, 200) || null;
  await svc
    .from("organizations")
    .update({
      plan: input.plan,
      billing_period: input.period === "jaarlijks" ? "jaarlijks" : "maandelijks",
      subscription_status: "proef",
      trial_started_at: day,
      trial_ends_at: addDays(day, TRIAL_DAYS),
      founding: code?.kind === "founding",
      discount_code: code?.code ?? null,
      billing_name: cut(input.billing.name),
      billing_vat: cut(input.billing.vat.replace(/\s/g, "").toUpperCase()),
      billing_address: cut(input.billing.address),
      billing_email: cut(input.billing.email),
    })
    .eq("id", ctx.org.id);
  if (code) {
    const row = must(await svc.from("discount_codes").select().eq("code", code.code).single());
    await svc
      .from("discount_codes")
      .update({ uses: row.uses + 1 })
      .eq("id", row.id);
  }
  if (hasAI(input.plan)) {
    const had = must(await svc.from("credits_ledger").select("id").eq("organization_id", ctx.org.id).eq("reason", "proefperiode"));
    if (!had.length) await svc.from("credits_ledger").insert({ organization_id: ctx.org.id, delta: TRIAL_CREDITS, reason: "proefperiode" });
  }
  return { ok: true as const };
}

/** Stap 11 · Zet mijn campagne live: de campagne gaat op Gepland. Naar Meta sturen gebeurt in fase 13. */
export async function launchOnboardingCampaign() {
  const { ctx, db } = await own();
  const t = await getTranslations("wizard");
  const c = must(await db.from("campaigns").select().eq("organization_id", ctx.org.id).eq("outside_adsweet", false).order("created_at").limit(1).maybeSingle());
  if (!c) return { ok: false as const };
  if (c.status === "concept") {
    await db.from("campaigns").update({ status: "gepland", launched_at: nowIso() }).eq("id", c.id);
    await db.from("ad_sets").update({ status: "actief" }).eq("campaign_id", c.id);
    await db.from("ads").update({ status: "in_review" }).eq("campaign_id", c.id);
    const ads = must(await db.from("ads").select("id").eq("campaign_id", c.id));
    await writeLog(db, ctx, {
      kind: "campagne",
      campaign_id: c.id,
      what: t("logLive", { name: c.name, amount: formatEuro(c.daily_budget ?? 0), ads: ads.length }),
    });
  }
  await serviceDb().from("organizations").update({ onboarding_step: STEP_COUNT }).eq("id", ctx.org.id);
  return { ok: true as const };
}

export async function finishOnboarding() {
  const { ctx } = await own();
  await serviceDb().from("organizations").update({ onboarding_done: true, onboarding_step: STEP_COUNT }).eq("id", ctx.org.id);
}
