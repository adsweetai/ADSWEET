import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type Ad, type AdSet, type Campaign, type Goal, type InsightDaily, type LogEntry, type Organization, type Targeting } from "@adsweet/db";
import { costPer, loserLimit, roas } from "@adsweet/playbook";
import { formatDayMonth, formatEuro, formatNumber, formatPercent, formatRoas, type Phase, type SeriesColor, type StatusKind } from "@adsweet/ui";
import { today } from "@/lib/clock";
import { periodRange, type Period } from "@/lib/period";
import { getDb } from "./auth";
import type { AppContext } from "./context";
import { ADS_ORDER, goalFor, goalKind, statusFor, sumRows, targets, totalsPerAd, type GoalKind, type Totals } from "./metrics";
import { currentPlaybook, minDailyBudget } from "./playbook";

// Gegevens voor de schermen rond campagnes en advertenties. De wijzigingen zelf staan in campaign-actions.ts.

const LIVE: Campaign["status"][] = ["actief", "leerfase"];
export const isLive = (c: Campaign) => LIVE.includes(c.status);

/** Campagnes van het gekozen advertentieaccount (of van de organisatie als er geen account is). */
export function inAccount(ctx: AppContext, c: Campaign) {
  return !ctx.account || !c.ad_account_id || c.ad_account_id === ctx.account.id;
}

type Tr = Awaited<ReturnType<typeof getTranslations>>;

// ---------------------------------------------------------------------------
// Lijst
// ---------------------------------------------------------------------------

export interface CampaignRowVM {
  id: string;
  name: string;
  client: string | null;
  status: string;
  kind: string;
  channel: string;
  budget: string;
  result: string;
  badge: { kind: StatusKind; label: string } | null;
  outside: boolean;
  deviations: string[];
}

export async function loadCampaignList(ctx: AppContext, period: Period): Promise<CampaignRowVM[]> {
  const t = await getTranslations("campaigns");
  const ts = await getTranslations("ui.status");
  const db = await getDb();
  // Een bureau dat niet in een klant werkt, ziet de campagnes van al zijn klanten.
  const overview = !!ctx.agency && !ctx.inClient;
  const orgs: Organization[] = overview ? ctx.clients : [ctx.org];
  const ids = orgs.map((o) => o.id);
  if (!ids.length) return [];
  const [campaigns, goals, rows] = await Promise.all([
    db.from("campaigns").select().in("organization_id", ids).order("created_at", { ascending: false }).then(must),
    db.from("goals").select().in("organization_id", ids).then(must),
    db.from("insights_daily").select().in("organization_id", ids).then(must),
  ]);
  const day = today();
  return campaigns
    .filter((c) => overview || inAccount(ctx, c))
    .sort((a, b) => Number(isLive(b)) - Number(isLive(a)))
    .map((c) => {
      const goal = goalFor(
        goals.filter((g) => g.organization_id === c.organization_id),
        c.ad_account_id,
      );
      const kind = goalKind(goal, c);
      const range = periodRange(period, day, c.start_date);
      const mine = rows.filter((r) => r.campaign_id === c.id && (!isLive(c) || (r.date >= range.from && r.date <= range.to)));
      const totals = sumRows(mine);
      const { result, badge } = resultFor(c, kind, totals, goal, t, ts);
      return {
        id: c.id,
        name: c.name,
        client: overview ? (orgs.find((o) => o.id === c.organization_id)?.name ?? null) : null,
        status: t(`status.${c.status}`),
        kind: t(`kinds.${kindKey(c)}`),
        channel: t(`channel.${c.channel}`),
        budget: c.daily_budget ? formatEuro(c.daily_budget) : t("budgetUnknown"),
        result,
        badge: c.outside_adsweet ? { kind: "warn", label: ts("warn") } : badge,
        outside: c.outside_adsweet,
        deviations: c.outside_adsweet ? c.deviations : [],
      };
    });
}

const kindKey = (c: Campaign) => (c.kind === "vast" ? "vast" : "special");

function resultFor(c: Campaign, kind: GoalKind, totals: Totals, goal: Goal | null, t: Tr, ts: Tr) {
  const tg = targets(goal);
  const status = statusFor(kind, totals, goal);
  const badge = status ? { kind: status, label: ts(status) } : null;
  if (c.status === "leerfase" || ((c.status === "gepland" || c.status === "concept") && totals.spend === 0))
    return { result: t("resultEarly"), badge: c.status === "leerfase" ? { kind: "ok" as const, label: ts("ok") } : null };
  if (totals.spend === 0) return { result: t("resultNone"), badge: null };
  if (kind === "sales" && tg.roasTarget)
    return { result: t("resultRoas", { roas: formatRoas(roas(totals.revenue, totals.spend), 2), be: formatRoas(tg.roasTarget) }), badge };
  if (kind === "leads" && tg.cpl) {
    const cpl = costPer(totals.spend, totals.leads);
    return { result: cpl === null ? t("resultNone") : t("resultCpl", { cpl: formatEuro(cpl, 2), target: formatEuro(tg.cpl) }), badge };
  }
  return { result: t("resultNone"), badge: null };
}

// ---------------------------------------------------------------------------
// Advertenties: label, cijfers en uitleg
// ---------------------------------------------------------------------------

export interface AdItemVM {
  id: string;
  code: string;
  name: string;
  title: string;
  kind: "foto" | "video";
  phase: Phase;
  label: NonNullable<Ad["label"]>;
  metric: string;
  changed: boolean;
  off: boolean;
  status: Ad["status"];
  campaignId: string;
  thumb: string | null;
}

interface Env {
  kind: GoalKind;
  goal: Goal | null;
  tt: Tr;
}

function metricLine(a: Ad, s: Totals, e: Env) {
  const fmt = (n: number) => formatEuro(n);
  if (e.kind === "leads") {
    return s.leads
      ? e.tt("adLeads", { spend: fmt(s.spend), count: s.leads, cpl: formatEuro(costPer(s.spend, s.leads) ?? 0, 2) })
      : e.tt("adLeadsNone", { spend: fmt(s.spend) });
  }
  return s.purchases ? e.tt("adSales", { roas: formatRoas(roas(s.revenue, s.spend), 2), count: s.purchases }) : e.tt("adSalesNone", { spend: fmt(s.spend) });
}

const anyExtraOn = (a: Ad) => Object.values(a.extras ?? {}).some(Boolean);

export function adItem(a: Ad, totals: Map<string, Totals>, e: Env, thumb: string | null): AdItemVM {
  const s = totals.get(a.id) ?? sumRows([]);
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    title: `${a.code} · ${a.name}`,
    kind: a.kind,
    phase: a.phase,
    label: e.kind === "none" ? "rapport" : (a.label ?? "vroeg"),
    metric: metricLine(a, s, e),
    changed: anyExtraOn(a),
    off: a.status === "uit",
    status: a.status,
    campaignId: a.campaign_id,
    thumb,
  };
}

/** Een url voor het beeld van een advertentie, als het opgeladen is. */
export const mediaUrl = (id: string | null, path: string | null) => (id && path ? `/api/media/${id}` : null);

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export interface CampaignDetailVM {
  id: string;
  name: string;
  status: Campaign["status"];
  statusLabel: string;
  statusKind: StatusKind | null;
  kindLabel: string;
  budgetText: string;
  budget: number | null;
  since: string | null;
  live: boolean;
  paused: boolean;
  outside: boolean;
  goalKind: GoalKind;
  tile: { label: string; value: string }[];
  structure: { line: string; adSets: { id: string; name: string; locked: boolean; learning: boolean; ads: AdItemVM[] }[] };
  funnel: Record<Phase, number>;
  scale: null | { text: string; button: string; to: number; toText: string };
  table: {
    res: string;
    kpi: string;
    rows: { id: string; title: string; sub: string; spend: string; res: string; kpi: string; label: AdItemVM["label"]; off: boolean }[];
  };
  settings: { key: string; label: string; value: string; sub?: string; warn?: boolean; editable: boolean }[];
  log: LogEntry[];
  adSetsRunning: { id: string; name: string; since: string | null }[];
}

export async function loadCampaignDetail(ctx: AppContext, id: string, period: Period): Promise<CampaignDetailVM | null> {
  const t = await getTranslations("campaign");
  const tc = await getTranslations("campaigns");
  const tt = await getTranslations("today");
  const db = await getDb();
  const campaign = must(await db.from("campaigns").select().eq("id", id).maybeSingle());
  if (!campaign || campaign.organization_id !== ctx.org.id) return null;
  const [adSets, ads, goals, rows, log, media] = await Promise.all([
    db.from("ad_sets").select().eq("campaign_id", id).order("created_at").then(must),
    db.from("ads").select().eq("campaign_id", id).then(must),
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("campaign_id", id).order("date").then(must),
    db.from("log_entries").select().eq("campaign_id", id).order("at", { ascending: false }).then(must),
    db.from("media").select("id, storage_path").eq("organization_id", ctx.org.id).then(must),
  ]);
  const goal = goalFor(goals, campaign.ad_account_id);
  const kind = goalKind(goal, campaign);
  const live = isLive(campaign);
  const range = periodRange(period, today(), campaign.start_date);
  const tileRows = live ? rows.filter((r) => r.date >= range.from && r.date <= range.to) : rows;
  const totals = sumRows(tileRows);
  const perAd = totalsPerAd(rows);
  const env: Env = { kind, goal, tt };
  const thumbOf = new Map(media.map((m) => [m.id, mediaUrl(m.id, m.storage_path)]));
  const items = ads.sort(ADS_ORDER).map((a) => adItem(a, perAd, env, a.media_id ? (thumbOf.get(a.media_id) ?? null) : null));
  const running = items.filter((a) => !a.off);

  // EuroTegel van de campagne
  const dash = "–";
  const has = tileRows.some((r) => Number(r.spend) > 0);
  const tile =
    kind === "leads"
      ? [
          { label: t("cols.spend"), value: has ? formatEuro(totals.spend) : dash },
          { label: t("cols.leads"), value: has ? formatNumber(totals.leads) : dash },
          { label: t("cols.cpl"), value: has && totals.leads ? formatEuro(costPer(totals.spend, totals.leads) ?? 0, 2) : dash },
        ]
      : kind === "sales"
        ? [
            { label: t("cols.spend"), value: has ? formatEuro(totals.spend) : dash },
            { label: t("cols.sales"), value: has ? formatNumber(totals.purchases) : dash },
            { label: t("revenue"), value: has ? formatEuro(totals.revenue) : dash },
            { label: t("cols.roas"), value: has ? formatRoas(roas(totals.revenue, totals.spend)) : dash },
          ]
        : [
            { label: t("cols.spend"), value: has ? formatEuro(totals.spend) : dash },
            { label: t("reach"), value: totals.reach !== null ? formatNumber(totals.reach) : dash },
          ];

  // Structuur: lopende ad sets hebben een slotje.
  const structure = {
    line: campaign.budget_level === "adset" ? t("campaignLineAdSet", { name: campaign.name }) : t("campaignLine", { name: campaign.name }),
    adSets: adSets.map((s) => ({
      id: s.id,
      name: s.name,
      locked: s.locked || s.status === "actief",
      learning: s.learning,
      ads: items.filter((a) => ads.find((x) => x.id === a.id)?.ad_set_id === s.id),
    })),
  };
  const funnel: Record<Phase, number> = { top: 0, middle: 0, bottom: 0 };
  for (const a of running) funnel[a.phase] += 1;

  // Voorstel om te schalen: er is een winnaar en het budget is nog niet verhoogd (een budgetwijziging in het logboek).
  let scale: CampaignDetailVM["scale"] = null;
  const raised = log.some((l) => l.kind === "budget" && !l.undone_at);
  const winners = items.filter((a) => a.label === "winnaar" && !a.off);
  if (campaign.status === "actief" && campaign.daily_budget && !raised && winners.length && kind !== "none") {
    const from = campaign.daily_budget;
    const to = Math.round(from * (1 + (await currentPlaybook()).scaleStep));
    if (kind === "sales")
      scale = {
        text: t("scaleSales", { from: formatEuro(from), to: formatEuro(to) }),
        button: t("scaleBtn", { to: formatEuro(to) }),
        to,
        toText: formatEuro(to),
      };
    else {
      const best = winners
        .map((w) => ({ w, cpl: costPer(perAd.get(w.id)?.spend ?? 0, perAd.get(w.id)?.leads ?? 0) }))
        .filter((x) => x.cpl !== null)
        .sort((a, b) => (a.cpl ?? 0) - (b.cpl ?? 0))[0];
      if (best)
        scale = {
          text: t("scaleLeads", { ad: best.w.name, cpl: formatEuro(best.cpl ?? 0, 2), from: formatEuro(from), to: formatEuro(to) }),
          button: t("scaleBtn", { to: formatEuro(to) }),
          to,
          toText: formatEuro(to),
        };
    }
  }

  // Tabel met alle advertenties
  const table = {
    res: kind === "leads" ? t("cols.leads") : t("cols.sales"),
    kpi: kind === "leads" ? t("cols.cpl") : t("cols.roas"),
    rows: items.map((a) => {
      const s = perAd.get(a.id) ?? sumRows([]);
      const res = kind === "leads" ? s.leads : s.purchases;
      const r = roas(s.revenue, s.spend);
      return {
        id: a.id,
        title: a.title,
        sub: `${a.kind === "video" ? t("video") : t("photo")} · ${a.phase[0].toUpperCase()}${a.phase.slice(1)}`,
        spend: formatEuro(s.spend),
        res: formatNumber(res),
        kpi: kind === "leads" ? (res ? formatEuro(costPer(s.spend, res) ?? 0, 2) : t("none")) : r > 0 ? formatRoas(r, 2) : "0",
        label: a.label,
        off: a.off,
      };
    }),
  };

  const settings = await settingsRows(campaign, ads, log, goal, t);
  const startLog = log.find((l) => l.kind === "campagne" && l.actor === "user");
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    statusLabel: tc(`status.${campaign.status}`),
    statusKind: campaign.status === "actief" || campaign.status === "leerfase" ? "ok" : campaign.status === "gepauzeerd" ? "warn" : null,
    kindLabel: tc(`kinds.${kindKey(campaign)}`),
    budgetText: campaign.daily_budget ? tc("perDay", { amount: formatEuro(campaign.daily_budget) }) : tc("perDay", { amount: tc("budgetUnknown") }),
    budget: campaign.daily_budget,
    since: campaign.start_date ? formatDayMonth(campaign.start_date) : startLog ? formatDayMonth(startLog.at.slice(0, 10)) : null,
    live,
    paused: campaign.status === "gepauzeerd",
    outside: campaign.outside_adsweet,
    goalKind: kind,
    tile,
    structure,
    funnel,
    scale,
    table,
    settings,
    log,
    adSetsRunning: adSets
      .filter((s) => s.status === "actief")
      .map((s) => ({ id: s.id, name: s.name, since: s.start_date ? formatDayMonth(s.start_date) : null })),
  };
}

export function targetingTexts(tgt: Targeting, t: Tr) {
  return {
    region: tgt.region ?? (tgt.countries ?? []).join(", "),
    countries: (tgt.countries ?? []).join(", "),
    languages: (tgt.languages ?? []).join(", "),
    age:
      tgt.age_max === null || tgt.age_max === undefined
        ? t("settings.agePlus", { min: tgt.age_min ?? 18 })
        : t("settings.ageRange", { min: tgt.age_min ?? 18, max: tgt.age_max }),
  };
}

async function settingsRows(c: Campaign, ads: Ad[], log: LogEntry[], goal: Goal | null, t: Tr): Promise<CampaignDetailVM["settings"]> {
  const tgt: Targeting = Object.keys(c.targeting ?? {}).length ? c.targeting : (goal?.targeting ?? {});
  const tx = targetingTexts(tgt, t);
  // Extra's die buiten AdSweet aangezet zijn.
  const on = ads.flatMap((a) =>
    (Object.entries(a.extras ?? {}) as [string, boolean][]).filter(([, v]) => v).map(([k]) => t("extraAt", { extra: t(`extras.${k}`), ad: a.name })),
  );
  const outsideLog = log.find((l) => l.actor === "outside" && l.kind === "extra" && !l.undone_at);
  const first = [...ads].sort(ADS_ORDER)[0];
  const utm = [
    `utm_source=${c.utm?.source ?? "meta"}`,
    `utm_medium=${c.utm?.medium ?? "paid_social"}`,
    c.utm?.campaign ? `utm_campaign=${c.utm.campaign}` : null,
    first ? `utm_content=${first.code.toLowerCase()}-${first.phase}-${first.kind === "video" ? "video" : "foto"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return [
    { key: "budget", label: t("settings.budget"), value: c.daily_budget ? formatEuro(c.daily_budget) : "[budget]", editable: true },
    { key: "goal", label: t("settings.goal"), value: t(`goals.${c.goal}`), editable: false },
    { key: "region", label: t("settings.region"), value: tx.region || "–", editable: false },
    { key: "languages", label: t("settings.languages"), value: tx.languages || "–", editable: false },
    { key: "age", label: t("settings.age"), value: tx.age, editable: false },
    { key: "placements", label: t("settings.placements"), value: t("settings.auto"), sub: "[plaatsingen PJ]", editable: false },
    {
      key: "extras",
      label: t("settings.extras"),
      value: on.length ? t("settings.extrasOn", { list: on.join(", ") }) : t("settings.extrasOff"),
      sub: on.length && outsideLog ? t("settings.extrasOutside", { date: formatDayMonth(outsideLog.at.slice(0, 10)) }) : undefined,
      warn: on.length > 0,
      editable: false,
    },
    { key: "payer", label: t("settings.payer"), value: c.payer ?? "–", editable: false },
    { key: "beneficiary", label: t("settings.beneficiary"), value: c.beneficiary ?? "–", editable: false },
    { key: "naming", label: t("settings.naming"), value: c.name, sub: utm, editable: false },
  ];
}

// ---------------------------------------------------------------------------
// Advertentiepaneel
// ---------------------------------------------------------------------------

export interface AdPanelVM {
  id: string;
  campaignId: string;
  title: string;
  name: string;
  phase: Phase;
  label: AdItemVM["label"];
  kind: "foto" | "video";
  status: Ad["status"];
  biz: { name: string; initial: string; color: SeriesColor };
  texts: string[];
  headline: string;
  description: string;
  cta: string;
  thumb: string | null;
  metrics: { k: string; v: string; muted: boolean }[];
  why: string;
}

export async function loadAdPanel(ctx: AppContext, adId: string): Promise<AdPanelVM | null> {
  const t = await getTranslations("adPanel");
  const db = await getDb();
  const ad = must(await db.from("ads").select().eq("id", adId).maybeSingle());
  if (!ad || ad.organization_id !== ctx.org.id) return null;
  const [campaign, goals, rows, media] = await Promise.all([
    db.from("campaigns").select().eq("id", ad.campaign_id).single().then(must),
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("ad_id", ad.id).then(must),
    ad.media_id ? db.from("media").select("id, storage_path").eq("id", ad.media_id).maybeSingle().then(must) : Promise.resolve(null),
  ]);
  const goal = goalFor(goals, campaign.ad_account_id);
  const kind = goalKind(goal, campaign);
  const s = sumRows(rows as InsightDaily[]);
  const tg = targets(goal);
  const U = t("fromMeta");
  const res = kind === "leads" ? s.leads : s.purchases;
  const cp = costPer(s.spend, res);
  const ctr = s.impressions && s.linkClicks !== null ? formatPercent(s.linkClicks / s.impressions) : U;
  const freq = s.impressions && s.reach ? formatNumber(s.impressions / s.reach, 1) : U;
  const metrics: [string, string][] =
    kind === "leads"
      ? [
          [t("metrics.spent"), formatEuro(s.spend)],
          [t("metrics.leads"), formatNumber(res)],
          [t("metrics.cpl"), cp === null ? t("none") : formatEuro(cp, 2)],
          [t("metrics.ctr"), ctr],
          [t("metrics.cpc"), U],
          [t("metrics.freq"), freq],
        ]
      : [
          [t("metrics.spent"), formatEuro(s.spend)],
          [t("metrics.sales"), formatNumber(res)],
          [t("metrics.cps"), cp === null ? t("none") : formatEuro(cp, 2)],
          [t("metrics.roas"), s.spend > 0 && s.revenue > 0 ? formatRoas(roas(s.revenue, s.spend), 2) : "0"],
          [t("metrics.ctr"), ctr],
          [t("metrics.cpc"), U],
          [t("metrics.freq"), freq],
        ];
  const label: AdItemVM["label"] = kind === "none" ? "rapport" : (ad.label ?? "vroeg");
  const why = whyText(label, kind, s, tg, rows.length === 0, t);
  const name = ctx.org.name;
  return {
    id: ad.id,
    campaignId: ad.campaign_id,
    title: `${ad.code} · ${ad.name}`,
    name: ad.name,
    phase: ad.phase,
    label,
    kind: ad.kind,
    status: ad.status,
    biz: { name, initial: name.slice(0, 1).toUpperCase(), color: ctx.org.color },
    texts: ad.variants?.primary_text?.length ? ad.variants.primary_text : ad.primary_text ? [ad.primary_text] : [],
    headline: ad.headline ?? "",
    description: ad.description ?? "",
    cta: ad.cta ?? "",
    thumb: media ? mediaUrl(media.id, media.storage_path) : null,
    metrics: metrics.map(([k, v]) => ({ k, v, muted: v === U })),
    why,
  };
}

function whyText(label: AdItemVM["label"], kind: GoalKind, s: Totals, tg: ReturnType<typeof targets>, isNew: boolean, t: Tr) {
  if (label === "rapport") return t("why.rapport");
  if (isNew) return t("why.new");
  const spend = formatEuro(s.spend);
  if (kind === "leads" && tg.cpl) {
    const cpl = costPer(s.spend, s.leads);
    if (label === "winnaar" && cpl !== null) return t("why.winnaarLeads", { cpl: formatEuro(cpl, 2), target: formatEuro(tg.cpl) });
    if (label === "geen" && cpl !== null)
      return t("why.geenLeads", { cpl: formatEuro(cpl, 2), target: formatEuro(tg.cpl), limit: formatEuro(loserLimit(tg.cpl)) });
    if (label === "verliezer") return t("why.verliezerLeads", { target: formatEuro(tg.cpl), limit: formatEuro(loserLimit(tg.cpl)), spend });
    return t("why.vroegLeads", { spend });
  }
  const be = tg.roasTarget ? formatRoas(tg.roasTarget) : "[break-even]";
  const r = formatRoas(roas(s.revenue, s.spend), 2);
  if (label === "winnaar") return t("why.winnaarSales", { be, roas: r });
  if (label === "geen") return t("why.geenSales", { be, roas: r });
  if (label === "verliezer" && tg.maxCpa)
    return t("why.verliezerSales", { target: formatEuro(tg.maxCpa, 2), limit: formatEuro(loserLimit(tg.maxCpa), 2), spend });
  return t("why.vroeg", { spend });
}

// ---------------------------------------------------------------------------
// Bibliotheek
// ---------------------------------------------------------------------------

export interface LibraryVM {
  ads: AdItemVM[];
  campaigns: { value: string; label: string }[];
  images: { id: string; name: string; source: string; use: string; thumb: string | null; kind: "foto" | "video" }[];
}

export async function loadLibrary(ctx: AppContext): Promise<LibraryVM> {
  const tt = await getTranslations("today");
  const tl = await getTranslations("ui.labels");
  const tlib = await getTranslations("library");
  const db = await getDb();
  const [campaigns, ads, goals, rows, media] = await Promise.all([
    db.from("campaigns").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
    db.from("ads").select().eq("organization_id", ctx.org.id).then(must),
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("organization_id", ctx.org.id).then(must),
    db.from("media").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
  ]);
  const mine = campaigns.filter((c) => inAccount(ctx, c));
  const perAd = totalsPerAd(rows);
  const thumbOf = new Map(media.map((m) => [m.id, mediaUrl(m.id, m.storage_path)]));
  const items: AdItemVM[] = [];
  for (const c of mine) {
    const goal = goalFor(goals, c.ad_account_id);
    const env: Env = { kind: goalKind(goal, c), goal, tt };
    for (const a of ads.filter((x) => x.campaign_id === c.id).sort(ADS_ORDER))
      items.push(adItem(a, perAd, env, a.media_id ? (thumbOf.get(a.media_id) ?? null) : null));
  }
  const images = media.map((m) => {
    const used = items.find((a) => m.used_in.includes(a.id));
    const result = used ? (used.label === "winnaar" || used.label === "geen" ? used.metric.split(" · ")[0] : tl(used.label)) : null;
    return {
      id: m.id,
      name: m.name ?? "",
      source: tlib(`sources.${m.source}`),
      use: used ? tlib("usedIn", { ad: used.code, result: result ?? "" }) : tlib("unused"),
      thumb: mediaUrl(m.id, m.storage_path),
      kind: m.kind,
    };
  });
  return { ads: items, campaigns: mine.map((c) => ({ value: c.id, label: c.name })), images };
}

// ---------------------------------------------------------------------------
// Wizard en advertentiemaker
// ---------------------------------------------------------------------------

export interface MakerContext {
  short: string;
  slug: string;
  isWebshop: boolean;
  goalType: "verkopen" | "aanvragen";
  defaultBudget: number;
  targeting: { region: string; countries: string; languages: string; age: string };
  biz: { name: string; initial: string; color: SeriesColor };
  campaigns: { id: string; name: string; adSets: { id: string; name: string; since: string | null }[]; adSetCount: number; funnel: Record<Phase, number> }[];
  texts: string[];
  headline: string;
  description: string;
  hasAI: boolean;
}

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function loadMakerContext(ctx: AppContext, hasAI: boolean): Promise<MakerContext> {
  const t = await getTranslations("campaign");
  const db = await getDb();
  const [goals, campaigns, adSets, ads] = await Promise.all([
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("campaigns").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
    db.from("ad_sets").select().eq("organization_id", ctx.org.id).order("created_at").then(must),
    db.from("ads").select().eq("organization_id", ctx.org.id).then(must),
  ]);
  const goal = goalFor(goals, ctx.account?.id);
  const kind = goalKind(goal);
  const mine = campaigns.filter((c) => inAccount(ctx, c) && !c.outside_adsweet && c.status !== "afgelopen");
  const vast = mine.find((c) => c.kind === "vast" && isLive(c));
  const naming = (ctx.org.naming ?? {}) as { short?: string };
  const short = naming.short ?? ctx.org.name;
  const minB = await minDailyBudget(ctx.org.kind === "webshop" && kind === "sales");
  // Teksten om van te vertrekken: die van je beste lopende advertentie. Vanaf fase 7 schrijft AdSweet ze met AI.
  const source = [...ads].filter((a) => a.status !== "uit").sort((a, b) => (a.label === "winnaar" ? -1 : 0) - (b.label === "winnaar" ? -1 : 0))[0];
  const texts = source?.variants?.primary_text?.length ? source.variants.primary_text : source?.primary_text ? [source.primary_text] : [];
  const fun = (cid: string) => {
    const f: Record<Phase, number> = { top: 0, middle: 0, bottom: 0 };
    for (const a of ads.filter((x) => x.campaign_id === cid && x.status !== "uit")) f[a.phase] += 1;
    return f;
  };
  return {
    short,
    slug: slugify(short),
    isWebshop: ctx.org.kind === "webshop",
    goalType: kind === "leads" ? "aanvragen" : "verkopen",
    defaultBudget: vast?.daily_budget ?? minB,
    targeting: targetingTexts(goal?.targeting ?? {}, t),
    biz: { name: ctx.org.name, initial: ctx.org.name.slice(0, 1).toUpperCase(), color: ctx.org.color },
    campaigns: mine
      .sort((a, b) => Number(isLive(b)) - Number(isLive(a)))
      .map((c) => ({
        id: c.id,
        name: c.name,
        adSets: adSets
          .filter((s: AdSet) => s.campaign_id === c.id && s.status === "actief")
          .map((s) => ({ id: s.id, name: s.name, since: s.start_date ? formatDayMonth(s.start_date) : null })),
        adSetCount: adSets.filter((s) => s.campaign_id === c.id).length,
        funnel: fun(c.id),
      })),
    texts,
    headline: source?.headline ?? "",
    description: source?.description ?? "",
    hasAI,
  };
}
