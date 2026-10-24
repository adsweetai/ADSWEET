import "server-only";
import { getTranslations } from "next-intl/server";
import {
  must,
  type Ad,
  type AdExtras,
  type AdSet,
  type Campaign,
  type CampaignGoal,
  type CampaignKind,
  type Db,
  type FunnelPhase,
  type SeriesColor,
} from "@adsweet/db";
import { PLAYBOOK } from "@adsweet/playbook";
import { formatDashDate, formatEuro, formatMonthCode } from "@adsweet/ui";
import { addDays, nowIso, today } from "@/lib/clock";
import { fillTemplate, namingOf, utmFor } from "@/lib/naming";
import { hasAI } from "@/lib/plans";
import { getDb, serviceDb } from "./auth";
import { assertCanEdit, getContext, type AppContext } from "./context";
import { writeLog } from "./changes";

// Wijzigingen rond campagnes en advertenties. Alles gebeurt op de klik van de klant en komt in het logboek.
// Er gaat nog niets naar Meta: dat komt in fase 13. Een nieuwe campagne staat daarom op "Gepland".

const EXTRAS_OFF: AdExtras = { muziek: false, tekst_op_beeld: false, beelduitbreiding: false, varianten: false };
const STRATEGIES: CampaignKind[] = ["vast", "solden", "bf", "feest", "event", "nieuw"];
const GOALS: CampaignGoal[] = ["verkopen", "aanvragen", "volgers", "bereik", "evenement"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function ownCampaign(db: Db, ctx: AppContext, id: string): Promise<Campaign | null> {
  const c = must(await db.from("campaigns").select().eq("id", id).maybeSingle());
  return c && c.organization_id === ctx.org.id ? c : null;
}

/** "AS2 · 07-12-2026 · nieuwe advertenties" */
async function newAdSet(
  db: Db,
  ctx: AppContext,
  c: Campaign,
  reason: string,
  start: string,
  opts: { status?: "concept" | "actief"; budget?: number | null } = {},
) {
  const existing = must(await db.from("ad_sets").select("id").eq("campaign_id", c.id));
  return must(
    await db
      .from("ad_sets")
      .insert({
        organization_id: ctx.org.id,
        campaign_id: c.id,
        name: fillTemplate(namingOf(ctx.org.naming, ctx.org.name).ad_set, { n: existing.length + 1, datum: formatDashDate(start), reden: reason }),
        reason,
        start_date: start,
        learning: true,
        locked: false,
        daily_budget: opts.budget ?? null,
        status: opts.status ?? "actief",
      })
      .select()
      .single(),
  );
}

/** De volgende code in een campagne: A6 na A5. Een nieuwe campagne begint bij A1. */
async function codeMaker(db: Db, campaignId: string) {
  const ads = must(await db.from("ads").select("code").eq("campaign_id", campaignId));
  const letter = ads[0]?.code.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = Math.max(0, ...ads.map((a) => Number(a.code.replace(/^[A-Z]+/, "")) || 0));
  return () => `${letter}${++n}`;
}

export const ctaFor = (phase: FunnelPhase, leads: boolean) => (phase === "bottom" ? (leads ? "Offerte aanvragen" : "Nu kopen") : "Meer informatie");

// ---------------------------------------------------------------------------
// Campagne
// ---------------------------------------------------------------------------

export async function setCampaignPaused(id: string, paused: boolean) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("logbook.entries");
  const ts = await getTranslations("campaigns.status");
  const c = await ownCampaign(db, ctx, id);
  if (!c) return { ok: false as const };
  const to = paused ? "gepauzeerd" : c.launched_at && c.start_date && c.start_date > today() ? "gepland" : "actief";
  if (c.status === to) return { ok: true as const };
  await db.from("campaigns").update({ status: to }).eq("id", c.id);
  const entry = await writeLog(db, ctx, {
    kind: "campagne",
    campaign_id: c.id,
    what: paused ? t("campaignPaused", { name: c.name }) : t("campaignResumed", { name: c.name }),
    from_to: t("fromTo", { from: ts(c.status), to: ts(to) }),
    undo: { kind: "campaign_status", campaign_id: c.id, value: c.status },
  });
  return { ok: true as const, logId: entry.id };
}

/** Nieuw budget per dag op campagneniveau. Lopende ad sets blijven zoals ze zijn. */
export async function setCampaignBudget(id: string, value: number, viaProposal: boolean) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("logbook.entries");
  const c = await ownCampaign(db, ctx, id);
  if (!c || !Number.isFinite(value) || value < 1 || value > 100_000) return { ok: false as const };
  const to = Math.round(value * 100) / 100;
  await db.from("campaigns").update({ daily_budget: to }).eq("id", c.id);
  const entry = await writeLog(db, ctx, {
    kind: "budget",
    campaign_id: c.id,
    what: viaProposal && c.kind === "vast" ? t("budgetUp") : t("budgetSet", { name: c.name }),
    from_to: c.daily_budget ? t("perDay", { from: formatEuro(c.daily_budget), to: formatEuro(to) }) : t("perDayNew", { to: formatEuro(to) }),
    undo: { kind: "budget", campaign_id: c.id, value: c.daily_budget },
  });
  return { ok: true as const, logId: entry.id, to };
}

export interface WizardInput {
  strategy: CampaignKind;
  goal: CampaignGoal;
  channel: "meta" | "google";
  sets: number;
  ads: number;
  budget: number;
  perSet: boolean;
  from: string | null;
  to: string | null;
  /** De afwijkingen die de klant bevestigde met "Toch doorgaan". */
  accepted: string[];
}

export type Deviation = "ads" | "sets" | "budget" | "perSet";

export function deviationsOf(w: Pick<WizardInput, "ads" | "sets" | "budget" | "perSet" | "goal">, isWebshop: boolean): Deviation[] {
  const minB = isWebshop && w.goal === "verkopen" ? PLAYBOOK.minDailyBudget.webshop : PLAYBOOK.minDailyBudget.default;
  const d: Deviation[] = [];
  if (w.ads < PLAYBOOK.startStructure.ads) d.push("ads");
  if (w.sets > PLAYBOOK.startStructure.adSets) d.push("sets");
  if (!(w.budget >= minB)) d.push("budget");
  if (w.perSet) d.push("perSet");
  return d;
}

/** Fase en soort per advertentie: 2 video's en 3 foto's, verdeeld 2 top, 2 middle, 1 bottom. [standaardverdeling PJ] */
const START_SLOTS: { kind: "video" | "foto"; phase: FunnelPhase }[] = [
  { kind: "video", phase: "top" },
  { kind: "video", phase: "middle" },
  { kind: "foto", phase: "top" },
  { kind: "foto", phase: "middle" },
  { kind: "foto", phase: "bottom" },
];
// Feestdagen (prototype): video top, video middle, foto top, foto bottom, foto bottom.
const XMAS_SLOTS: { kind: "video" | "foto"; phase: FunnelPhase }[] = [
  { kind: "video", phase: "top" },
  { kind: "video", phase: "middle" },
  { kind: "foto", phase: "top" },
  { kind: "foto", phase: "bottom" },
  { kind: "foto", phase: "bottom" },
];

export async function createCampaign(w: WizardInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const t = await getTranslations("wizard");
  const tg = await getTranslations("campaign.goals");
  const db = await getDb();
  if (!STRATEGIES.includes(w.strategy) || !GOALS.includes(w.goal)) return { ok: false, error: "keuze" };
  if (w.channel !== "meta") return { ok: false, error: "google" };
  const sets = Math.round(w.sets);
  const n = Math.round(w.ads);
  if (!(sets >= 1 && sets <= 5 && n >= 1 && n <= 10)) return { ok: false, error: "structuur" };
  const budget = Math.round(Number(w.budget) * 100) / 100;
  if (!(budget > 0 && budget <= 100_000)) return { ok: false, error: "budget" };
  const devs = deviationsOf({ ...w, sets, ads: n, budget }, ctx.org.kind === "webshop");
  if (devs.some((d) => !w.accepted.includes(d))) return { ok: false, error: "afwijking" };

  const special = w.strategy !== "vast";
  const start = special && w.from && ISO.test(w.from) ? w.from : addDays(today(), 1);
  const end = special && w.to && ISO.test(w.to) && w.to >= start ? w.to : null;
  const [goals, profile] = await Promise.all([
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("business_profiles").select().eq("organization_id", ctx.org.id).maybeSingle().then(must),
  ]);
  const goal = goals.find((g) => g.ad_account_id === ctx.account?.id) ?? goals[0] ?? null;
  const naming = namingOf(ctx.org.naming, ctx.org.name);
  const short = naming.short;
  const stratName = (t.raw(`strategies.${w.strategy}`) as string[])[0];
  const name = fillTemplate(naming.campaign, { zaak: short, soort: special ? stratName : "Vast", doel: tg(w.goal), maand: formatMonthCode(start) });
  const utm = utmFor(naming, { zaak: short, soort: w.strategy, doel: w.goal });
  const devNames = devs.map((d) => t(`deviationNames.${d}`));

  const campaign = must(
    await db
      .from("campaigns")
      .insert({
        organization_id: ctx.org.id,
        ad_account_id: ctx.account?.id ?? null,
        name,
        kind: w.strategy,
        goal: w.goal,
        channel: "meta",
        status: "gepland",
        daily_budget: budget,
        budget_level: w.perSet ? "adset" : "campagne",
        start_date: start,
        end_date: end,
        deviations: devNames,
        targeting: goal?.targeting ?? {},
        placements: "automatisch",
        extras_off: true,
        payer: profile?.payer ?? ctx.org.name,
        beneficiary: profile?.beneficiary ?? ctx.org.name,
        utm: { source: utm.source, medium: utm.medium, campaign: utm.campaign },
        created_by: ctx.user.id,
        launched_at: nowIso(),
      })
      .select()
      .single(),
  );
  const adSets: AdSet[] = [];
  for (let i = 0; i < sets; i++)
    adSets.push(await newAdSet(db, ctx, campaign, "start", start, { status: "concept", budget: w.perSet ? Math.round((budget / sets) * 100) / 100 : null }));
  const xmas = w.strategy === "feest";
  const names = xmas ? (t.raw("xmasNames") as string[]) : [];
  const slots = xmas ? XMAS_SLOTS : START_SLOTS;
  const leads = w.goal === "aanvragen";
  const rows = Array.from({ length: n }, (_, i) => {
    const slot = slots[i % slots.length];
    return {
      organization_id: ctx.org.id,
      campaign_id: campaign.id,
      ad_set_id: adSets[i % adSets.length].id,
      code: `A${i + 1}`,
      name: names[i] ?? t("adSlot", { n: i + 1 }),
      kind: slot.kind,
      phase: slot.phase,
      cta: ctaFor(slot.phase, leads),
      variants: {},
      extras: EXTRAS_OFF,
      status: "concept" as const,
      review_status: "wordt_nagekeken" as const,
    };
  });
  await db.from("ads").insert(rows);
  await writeLog(db, ctx, { kind: "campagne", campaign_id: campaign.id, what: t("logLive", { name, amount: formatEuro(budget), ads: n }) });
  return { ok: true, id: campaign.id };
}

// ---------------------------------------------------------------------------
// Advertenties
// ---------------------------------------------------------------------------

export interface NewAd {
  name: string;
  kind: "foto" | "video";
  phase: FunnelPhase;
  primaryText: string;
  variants: string[];
  headline: string;
  description: string;
  cta: string;
  extras?: Partial<AdExtras>;
  mediaId?: string | null;
}

const clean = (s: unknown, max = 2000) =>
  String(s ?? "")
    .slice(0, max)
    .trim();

function adRow(ctx: AppContext, c: Campaign, adSetId: string, code: string, a: NewAd, status: Ad["status"]) {
  const variants = a.variants
    .map((v) => clean(v))
    .filter(Boolean)
    .slice(0, 5);
  return {
    organization_id: ctx.org.id,
    campaign_id: c.id,
    ad_set_id: adSetId,
    media_id: a.mediaId ?? null,
    code,
    name: clean(a.name, 120) || code,
    kind: a.kind === "video" ? ("video" as const) : ("foto" as const),
    phase: (["top", "middle", "bottom"] as const).includes(a.phase) ? a.phase : ("bottom" as const),
    primary_text: clean(a.primaryText) || null,
    headline: clean(a.headline, 255) || null,
    description: clean(a.description, 255) || null,
    cta: clean(a.cta, 60) || null,
    variants: variants.length ? { primary_text: variants } : {},
    extras: { ...EXTRAS_OFF, ...a.extras },
    status,
    review_status: "wordt_nagekeken" as const,
  };
}

async function markMediaUsed(db: Db, ctx: AppContext, mediaIds: (string | null | undefined)[], adIds: string[]) {
  for (let i = 0; i < mediaIds.length; i++) {
    const id = mediaIds[i];
    if (!id) continue;
    const m = must(await db.from("media").select().eq("id", id).maybeSingle());
    if (m && m.organization_id === ctx.org.id)
      await db
        .from("media")
        .update({ used_in: [...m.used_in, adIds[i]] })
        .eq("id", id);
  }
}

/**
 * Eén advertentie live zetten. Standaard in een nieuwe ad set. In een bestaande ad set alleen als de klant de
 * waarschuwing bevestigde: die ad set gaat dan terug in de leerfase.
 */
export async function launchAd(input: { campaignId: string; adSetId: string | null; confirmed: boolean; draft: boolean; ad: NewAd }) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("adMaker");
  const c = await ownCampaign(db, ctx, input.campaignId);
  if (!c) return { ok: false as const, error: "campagne" };
  if (!hasAI(ctx.plan) && input.ad.variants.length > 1) input.ad.variants = input.ad.variants.slice(0, 1);
  let adSetId: string;
  let adSetName: string;
  let existing = false;
  if (input.adSetId) {
    if (!input.confirmed) return { ok: false as const, error: "bevestig" };
    const s = must(await db.from("ad_sets").select().eq("id", input.adSetId).maybeSingle());
    if (!s || s.campaign_id !== c.id) return { ok: false as const, error: "adset" };
    adSetId = s.id;
    adSetName = s.name.split(" · ")[0];
    existing = true;
  } else {
    const s = await newAdSet(db, ctx, c, t("adSetReason"), today(), { status: input.draft ? "concept" : "actief" });
    adSetId = s.id;
    adSetName = s.name.split(" · ")[0];
  }
  const next = await codeMaker(db, c.id);
  const ad = must(
    await db
      .from("ads")
      .insert(adRow(ctx, c, adSetId, next(), input.ad, input.draft ? "concept" : "in_review"))
      .select()
      .single(),
  );
  await markMediaUsed(db, ctx, [input.ad.mediaId], [ad.id]);
  if (existing && !input.draft) await db.from("ad_sets").update({ learning: true }).eq("id", adSetId);
  if (!input.draft)
    await writeLog(db, ctx, {
      kind: "advertentie",
      campaign_id: c.id,
      what: t("logLive", { ad: ad.name, adset: adSetName }),
      from_to: existing ? t("logLiveExisting") : t("logLiveSub"),
    });
  return { ok: true as const, campaignId: c.id, adId: ad.id };
}

/** Bulk launch: alles in nieuwe ad sets van vijf. */
export async function bulkLaunch(input: { campaignId: string; ads: NewAd[] }) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("bulk");
  const c = await ownCampaign(db, ctx, input.campaignId);
  if (!c || !input.ads.length || input.ads.length > 100) return { ok: false as const };
  const next = await codeMaker(db, c.id);
  const names: string[] = [];
  const created: string[] = [];
  for (let i = 0; i < input.ads.length; i += 5) {
    const s = await newAdSet(db, ctx, c, t("adSetReason"), today());
    names.push(s.name.split(" · ")[0]);
    const chunk = input.ads.slice(i, i + 5);
    const rows = must(
      await db
        .from("ads")
        .insert(chunk.map((a) => adRow(ctx, c, s.id, next(), a, "in_review")))
        .select(),
    );
    await markMediaUsed(
      db,
      ctx,
      chunk.map((a) => a.mediaId),
      rows.map((r) => r.id),
    );
    created.push(...rows.map((r) => r.id));
  }
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t("and")} ${names.at(-1)}` : names[0];
  await writeLog(db, ctx, { kind: "advertentie", campaign_id: c.id, what: t("log", { n: created.length, names: list }) });
  return { ok: true as const, n: created.length, sets: names.length, names: list };
}

/** Testgrid: drie varianten van één ding, in een nieuwe ad set. */
export async function startTestgrid(input: { campaignId: string; what: "koppen" | "beelden" | "regio" | "plaats"; variants: string[] }) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("testgrid");
  const c = await ownCampaign(db, ctx, input.campaignId);
  const variants = input.variants.map((v) => clean(v, 255)).filter(Boolean);
  if (!c || !["koppen", "beelden", "regio", "plaats"].includes(input.what) || variants.length < 2) return { ok: false as const };
  const ads = must(await db.from("ads").select().eq("campaign_id", c.id));
  const base = ads.find((a) => a.label === "winnaar" && a.status !== "uit") ?? ads.find((a) => a.status !== "uit") ?? null;
  const s = await newAdSet(db, ctx, c, t("adSetReason", { what: (t.raw(`options.${input.what}`) as string[])[0].toLowerCase() }), today());
  const next = await codeMaker(db, c.id);
  const leads = c.goal === "aanvragen";
  await db.from("ads").insert(
    variants.map((v) =>
      adRow(
        ctx,
        c,
        s.id,
        next(),
        {
          name: input.what === "koppen" ? v : `${base?.name ?? c.name} · ${v}`,
          kind: base?.kind ?? "foto",
          phase: base?.phase ?? "bottom",
          primaryText: base?.primary_text ?? "",
          variants: [],
          headline: input.what === "koppen" ? v : (base?.headline ?? ""),
          description: base?.description ?? "",
          cta: base?.cta ?? ctaFor(base?.phase ?? "bottom", leads),
          mediaId: base?.media_id ?? null,
        },
        "in_review",
      ),
    ),
  );
  const label = (t.raw(`options.${input.what}`) as string[])[0].toLowerCase();
  await writeLog(db, ctx, { kind: "advertentie", campaign_id: c.id, what: t("log", { n: variants.length, what: label }) });
  return { ok: true as const };
}

/** Dupliceren in een nieuwe ad set (V1). De bestaande reacties en likes blijven behouden zodra Meta gekoppeld is. */
export async function duplicateAd(adId: string) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("adPanel");
  const ad = must(await db.from("ads").select().eq("id", adId).maybeSingle());
  if (!ad || ad.organization_id !== ctx.org.id) return { ok: false as const };
  const c = await ownCampaign(db, ctx, ad.campaign_id);
  if (!c) return { ok: false as const };
  const s = await newAdSet(db, ctx, c, t("dupReason"), today());
  const next = await codeMaker(db, c.id);
  await db.from("ads").insert({
    ...adRow(
      ctx,
      c,
      s.id,
      next(),
      {
        name: ad.name,
        kind: ad.kind,
        phase: ad.phase,
        primaryText: ad.primary_text ?? "",
        variants: ad.variants?.primary_text ?? [],
        headline: ad.headline ?? "",
        description: ad.description ?? "",
        cta: ad.cta ?? "",
        mediaId: ad.media_id,
      },
      "in_review",
    ),
    meta_id: null,
  });
  await writeLog(db, ctx, { kind: "advertentie", campaign_id: c.id, what: t("dupLog", { name: ad.name }), from_to: t("dupLogSub") });
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Preview-link
// ---------------------------------------------------------------------------

export async function ensurePreviewLink(campaignId: string) {
  const ctx = await getContext();
  const db = await getDb();
  const c = await ownCampaign(db, ctx, campaignId);
  if (!c) return null;
  const found = must(await db.from("preview_links").select().eq("campaign_id", c.id).order("created_at").limit(1).maybeSingle());
  if (found || !ctx.canEdit) return found;
  return must(await db.from("preview_links").insert({ organization_id: ctx.org.id, campaign_id: c.id, created_by: ctx.user.id }).select().single());
}

export interface PublicPreview {
  code: string;
  asker: string;
  biz: { name: string; color: SeriesColor };
  ads: {
    id: string;
    title: string;
    text: string;
    headline: string;
    cta: string;
    kind: "foto" | "video";
    status: "goedgekeurd" | "opmerking" | null;
    note: string;
  }[];
}

/** De openbare pagina /p/[code]. Zonder account: de server leest met de service role, alleen op basis van de code. */
export async function loadPublicPreview(code: string): Promise<PublicPreview | null> {
  if (!/^[a-f0-9]{8,64}$/.test(code)) return null;
  const db = serviceDb();
  const link = must(await db.from("preview_links").select().eq("code", code).maybeSingle());
  if (!link) return null;
  const [org, ads, feedback, profile] = await Promise.all([
    db.from("organizations").select("id, name, color").eq("id", link.organization_id).single().then(must),
    db.from("ads").select().eq("campaign_id", link.campaign_id).neq("status", "uit").then(must),
    db.from("preview_feedback").select().eq("link_id", link.id).then(must),
    link.created_by ? db.from("profiles").select("first_name").eq("user_id", link.created_by).maybeSingle().then(must) : Promise.resolve(null),
  ]);
  return {
    code,
    asker: profile?.first_name ?? org.name,
    biz: { name: org.name, color: org.color },
    ads: ads
      .sort((a, b) => a.code.localeCompare(b.code, "nl", { numeric: true }))
      .map((a) => {
        const f = feedback.find((x) => x.ad_id === a.id);
        return {
          id: a.id,
          title: `${a.code} · ${a.name}`,
          text: a.primary_text ?? "",
          headline: a.headline ?? "",
          cta: a.cta ?? "",
          kind: a.kind,
          status: f?.status ?? null,
          note: f?.note ?? "",
        };
      }),
  };
}

export async function savePreviewFeedback(code: string, adId: string, status: "goedgekeurd" | "opmerking" | null, note: string) {
  if (!/^[a-f0-9]{8,64}$/.test(code)) return { ok: false };
  const db = serviceDb();
  const link = must(await db.from("preview_links").select().eq("code", code).maybeSingle());
  if (!link) return { ok: false };
  const ad = must(await db.from("ads").select("id, campaign_id").eq("id", adId).maybeSingle());
  if (!ad || ad.campaign_id !== link.campaign_id) return { ok: false };
  const existing = must(await db.from("preview_feedback").select("id").eq("link_id", link.id).eq("ad_id", ad.id).maybeSingle());
  if (!status) {
    if (existing) await db.from("preview_feedback").delete().eq("id", existing.id);
    return { ok: true };
  }
  const row = { status, note: status === "opmerking" ? clean(note, 1000) : null };
  if (existing) await db.from("preview_feedback").update(row).eq("id", existing.id);
  else await db.from("preview_feedback").insert({ link_id: link.id, organization_id: link.organization_id, ad_id: ad.id, ...row });
  return { ok: true };
}
