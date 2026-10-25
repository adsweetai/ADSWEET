import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type Ad, type Campaign, type Recommendation } from "@adsweet/db";
import { costPer, roas, salesStatus } from "@adsweet/playbook";
import { formatEuro, formatNumber, formatPercent, formatRoas, brusselsDate, type StatusKind } from "@adsweet/ui";
import { addDays, today } from "@/lib/clock";
import { isDemo } from "@/lib/env";
import { periodRange, type Period } from "@/lib/period";
import { hasAI, PLAN_NAME } from "@/lib/plans";
import { getDb } from "./auth";
import { needsOnboarding, onboardingHref, type AppContext } from "./context";
import { ADS_ORDER, goalFor, goalKind, insightRows, statusFor, sumRows, targets, totalsForCampaigns, totalsPerAd, type GoalKind, type Totals } from "./metrics";

export type Variant = "normaal" | "dag1" | "rapport" | "leeg";

export interface CardButton {
  label: string;
  kind: "apply" | "decide" | "link" | "gate" | "account";
  href?: string;
  decision?: "zo-laten";
  gate?: { plan: string; text: string };
  accountId?: string;
  locked?: boolean;
  toast?: string;
}

export interface CardVM {
  id: string;
  type: string;
  badge?: { kind: StatusKind; label: string };
  title: string;
  stats?: { label: string; value: string }[];
  text?: string;
  /** Kan <term>…</term> bevatten voor een vakwoord. */
  explain?: string;
  why?: { lines: string[]; lesson: { label: string; href: string } };
  warning?: string;
  tip?: string;
  primary?: CardButton;
  secondary?: CardButton[];
  later: boolean;
}

export interface AdRowVM {
  id: string;
  name: string;
  kind: "foto" | "video";
  phase: Ad["phase"];
  label: NonNullable<Ad["label"]>;
  metric: string;
}

export interface TodayVM {
  variant: Variant;
  forced: boolean;
  showVariants: boolean;
  greeting: string;
  summary: string;
  status: { kind: "act" | "warn" | "info"; text: string }[];
  tuning: boolean;
  /** Nog geen onboarding: de kaart om ze in te vullen (href voor de eigenaar), en de rest staat op slot. */
  onboarding: { href: string | null; started: boolean } | null;
  sweet: string | null;
  accounts: null | {
    rows: { id: string; name: string; spend: string; sales: string; revenue: string; roas: string; be: string; status: StatusKind; active: boolean }[];
    total: { spend: string; sales: string; revenue: string; roas: string };
    note: string;
  };
  tile: null | {
    blocks: { label: string; value: string; term?: boolean }[];
    caption: string;
    example: boolean;
    note?: string;
    status?: { kind: StatusKind; label: string } | { kind: "rapport"; label: string };
  };
  dayOne: null | { ads: { name: string; status: "goedgekeurd" | "wordt_nagekeken" | "afgekeurd" }[] };
  cards: CardVM[];
  noCards: boolean;
  lists: { title: string; ads: AdRowVM[] }[];
  tip: string;
}

const pct = (n: number) => formatPercent(n);

export async function buildToday(ctx: AppContext, period: Period, forcedVariant?: Variant): Promise<TodayVM> {
  const t = await getTranslations("today");
  const tc = await getTranslations("cards");
  const ts = await getTranslations("ui.status");
  const tl = await getTranslations("ui.labels");
  const tg = await getTranslations("gates");
  const tu = await getTranslations("ui");
  const db = await getDb();
  const day = today();
  const { org } = ctx;
  const multi = ctx.adAccounts.length > 1;
  const account = ctx.account ?? ctx.adAccounts[0] ?? null;
  const name = ctx.profile.first_name ?? "";

  const [goals, campaigns, ads, recs] = await Promise.all([
    db.from("goals").select().eq("organization_id", org.id).then(must),
    db.from("campaigns").select().eq("organization_id", org.id).then(must),
    db.from("ads").select().eq("organization_id", org.id).then(must),
    db.from("recommendations").select().eq("organization_id", org.id).in("status", ["open", "later"]).order("sort").then(must),
  ]);
  const allRows = await insightRows(db, org.id);
  const goal = goalFor(goals, account?.id);
  const tgt = targets(goal);

  // De campagne die nu loopt in dit account (de vaste, anders de nieuwste die actief is).
  const accCampaigns = campaigns.filter((c) => !account || c.ad_account_id === account.id || !c.ad_account_id);
  const live = accCampaigns.filter((c) => ["actief", "leerfase"].includes(c.status));
  const main: Campaign | null = live.find((c) => c.kind === "vast") ?? live[0] ?? null;
  const kind: GoalKind = goalKind(goal, main);

  const range = periodRange(period, day, main?.start_date ?? null);
  const inRange = allRows.filter((r) => r.date >= range.from && r.date <= range.to);
  const liveIds = new Set(live.map((c) => c.id));
  const totals = totalsForCampaigns(inRange, liveIds);
  const periodText = t(`period.${period}`);
  const periodCap = t(`periodCap.${period}`);

  // Variant: uit de data, of gekozen in de demo.
  const firstDay = main && main.status === "leerfase" && main.start_date && main.start_date >= addDays(day, -1);
  const openRecs = recs.filter((r) => r.status === "open" || (r.status === "later" && r.snoozed_until && r.snoozed_until <= day));
  let variant: Variant = firstDay ? "dag1" : kind === "none" && main ? "rapport" : "normaal";
  if (forcedVariant) variant = forcedVariant;
  if (!forcedVariant && variant === "normaal" && openRecs.length === 0) variant = "leeg";

  // ---------- Kaarten ----------
  const adById = new Map(ads.map((a) => [a.id, a]));
  const adStarts = totalsPerAd(allRows);
  const cards: CardVM[] = [];
  const fmtE = (n: number) => formatEuro(n);
  for (const r of openRecs) {
    const card = await cardFor(r, {
      tt: t,
      why: tu("why"),
      tc,
      ts,
      tg,
      name,
      plan: ctx.plan,
      adById,
      ctx,
      accountOf: (id) => ctx.adAccounts.find((a) => a.id === id)?.name ?? "",
      tgt,
      fmtE,
    });
    if (card) cards.push(card);
  }
  const shownCards = variant === "normaal" ? cards : [];

  const onboarding = needsOnboarding(ctx) ? { href: onboardingHref(ctx), started: (org.onboarding_step ?? 1) > 1 } : null;

  // ---------- Samenvatting en status ----------
  let summary: string;
  const accountsView = multi && variant === "normaal";
  if (variant === "dag1") summary = t("summaryDay1");
  else if (variant === "rapport") summary = t("summaryReport", { period: periodText });
  else if (variant === "leeg") summary = t("summaryEmpty");
  else if (!main) summary = t("summaryNoCampaign");
  else if (accountsView) {
    const allLive = new Set(campaigns.filter((c) => ["actief", "leerfase"].includes(c.status)).map((c) => c.id));
    const all = totalsForCampaigns(inRange, allLive);
    const worst = ctx.adAccounts
      .map((a) => {
        const ids = new Set(campaigns.filter((c) => c.ad_account_id === a.id && allLive.has(c.id)).map((c) => c.id));
        const tot = totalsForCampaigns(inRange, ids);
        const g = targets(goalFor(goals, a.id));
        return { a, ratio: tot.spend && g.roasTarget ? roas(tot.revenue, tot.spend) / g.roasTarget : 1 };
      })
      .sort((x, y) => x.ratio - y.ratio)[0];
    const n = t.has(`numbers.${ctx.adAccounts.length}`) ? t(`numbers.${ctx.adAccounts.length}`) : String(ctx.adAccounts.length);
    const args = { n, period: periodText, count: all.purchases, revenue: fmtE(all.revenue), worst: worst?.a.name ?? "" };
    summary = worst && worst.ratio < 1 ? t("summaryAccounts", args) : t("summaryAccountsOk", args);
  } else if (kind === "leads") {
    const cpl = costPer(totals.spend, totals.leads);
    summary =
      cpl !== null
        ? t("summaryLeads", { period: periodText, count: totals.leads, cpl: formatEuro(cpl, 2), target: fmtE(tgt.cpl ?? 0) })
        : t("summaryLeadsNone", { period: periodText, target: fmtE(tgt.cpl ?? 0) });
  } else {
    const loser = openRecs.some((r) => r.type === "verliezer");
    summary = t(loser ? "summarySalesLoser" : "summarySales", { period: periodText, count: totals.purchases });
  }

  const actN = shownCards.filter((c) => c.badge?.kind === "act").length;
  const warnN = shownCards.filter((c) => c.badge?.kind === "warn").length;
  const infoN = shownCards.filter((c) => !c.badge).length;
  const status: TodayVM["status"] = [];
  if (actN) status.push({ kind: "act", text: t("statusAct", { n: actN }) });
  if (warnN) status.push({ kind: "warn", text: t("statusWarn", { n: warnN }) });
  if (infoN && !warnN) status.push({ kind: "info", text: t("statusInfo", { n: infoN }) });

  // ---------- Sweetmoment: nieuwe resultaten sinds het vorige bezoek ----------
  let sweet: string | null = null;
  if (variant === "normaal" && ctx.profile.last_seen_at && kind !== "none") {
    const seen = brusselsDate(ctx.profile.last_seen_at);
    const fresh = sumRows(allRows.filter((r) => r.date >= seen && liveIds.has(r.campaign_id)));
    const n = kind === "sales" ? fresh.purchases : fresh.leads;
    if (n > 0 && !accountsView) {
      const sinceYesterday = seen === addDays(day, -1);
      const key = kind === "sales" ? (sinceYesterday ? "sweetSales" : "sweetSalesVisit") : sinceYesterday ? "sweetLeads" : "sweetLeadsVisit";
      sweet = t(key, { n });
    }
  }

  // ---------- Al je accounts (vanaf Scale) ----------
  let accounts: TodayVM["accounts"] = null;
  if (accountsView) {
    const rows = ctx.adAccounts.map((a) => {
      const ids = new Set(campaigns.filter((c) => c.ad_account_id === a.id && ["actief", "leerfase"].includes(c.status)).map((c) => c.id));
      const tot = totalsForCampaigns(inRange, ids);
      const g = targets(goalFor(goals, a.id));
      const r = roas(tot.revenue, tot.spend);
      return {
        id: a.id,
        name: a.name,
        spend: fmtE(tot.spend),
        sales: formatNumber(tot.purchases),
        revenue: fmtE(tot.revenue),
        roas: formatRoas(r, 2),
        be: g.breakEven ? formatRoas(g.breakEven, 2) : "–",
        status: (g.roasTarget ? salesStatus(r, g.roasTarget) : "ok") as StatusKind,
        active: a.id === account?.id,
      };
    });
    const allLive = new Set(campaigns.filter((c) => ["actief", "leerfase"].includes(c.status)).map((c) => c.id));
    const all = totalsForCampaigns(inRange, allLive);
    accounts = {
      rows,
      total: { spend: fmtE(all.spend), sales: formatNumber(all.purchases), revenue: fmtE(all.revenue), roas: formatRoas(roas(all.revenue, all.spend), 2) },
      note: t("accNote", { period: periodCap }),
    };
  }

  // ---------- EuroTegel ----------
  let tile: TodayVM["tile"] = null;
  const caption = accountsView && account ? t("tileCaptionAccount", { account: account.name, period: periodText }) : t("tileCaption", { period: periodCap });
  if (variant === "rapport") {
    tile = {
      blocks: [
        { label: t("tile.reach"), value: totals.reach !== null && kind === "none" ? formatNumber(totals.reach) : "[bereik]" },
        { label: t("tile.impressions"), value: totals.impressions !== null && kind === "none" ? formatNumber(totals.impressions) : "[vertoningen]" },
        { label: t("tile.followers"), value: totals.followers !== null && kind === "none" ? formatNumber(totals.followers) : "[volgers]" },
      ],
      caption,
      example: isDemo,
      status: { kind: "rapport", label: tl("rapport") },
    };
  } else if (variant !== "dag1" && main) {
    const accTotals: Totals = totals;
    const st = statusFor(kind, accTotals, goal);
    if (kind === "leads") {
      const cpl = costPer(accTotals.spend, accTotals.leads);
      tile = {
        blocks: [
          { label: t("tile.spent"), value: fmtE(accTotals.spend) },
          { label: t("tile.leads"), value: formatNumber(accTotals.leads) },
          { label: t("tile.cpl"), value: cpl !== null ? formatEuro(cpl, 2) : "–", term: true },
        ],
        caption,
        example: isDemo,
        note: tgt.cpl ? t("goalLead", { value: fmtE(tgt.cpl) }) : undefined,
        status: st ? { kind: st, label: ts(st) } : undefined,
      };
    } else {
      tile = {
        blocks: [
          { label: t("tile.spent"), value: fmtE(accTotals.spend) },
          { label: t("tile.sales"), value: formatNumber(accTotals.purchases) },
          { label: t("tile.revenue"), value: fmtE(accTotals.revenue) },
          { label: t("tile.roas"), value: formatRoas(roas(accTotals.revenue, accTotals.spend)), term: true },
        ],
        caption,
        example: isDemo,
        note: goal?.target_roas
          ? t("targetRoas", { value: formatRoas(Number(goal.target_roas)) })
          : tgt.breakEven
            ? t("breakEven", { value: formatRoas(tgt.breakEven, accountsView ? 2 : undefined) })
            : undefined,
        status: st ? { kind: st, label: ts(st) } : undefined,
      };
    }
  }

  // ---------- Dag 1: de advertenties die Meta nog nakijkt ----------
  const mainAds = ads.filter((a) => main && a.campaign_id === main.id).sort(ADS_ORDER);
  const dayOne: TodayVM["dayOne"] =
    variant === "dag1" ? { ads: mainAds.map((a) => ({ name: a.name.startsWith("Advertentie") ? a.name : a.code, status: a.review_status })) } : null;

  // ---------- Wat goed loopt / wat minder loopt (sinds de start) ----------
  const adRow = (a: Ad): AdRowVM => {
    const s = adStarts.get(a.id) ?? sumRows([]);
    const res = kind === "leads" ? s.leads : s.purchases;
    let metric: string;
    if (kind === "leads")
      metric = res
        ? t("adLeads", { spend: fmtE(s.spend), count: res, cpl: formatEuro(costPer(s.spend, res) ?? 0, 2) })
        : t("adLeadsNone", { spend: fmtE(s.spend) });
    else metric = res ? t("adSales", { roas: formatRoas(roas(s.revenue, s.spend), 2), count: res }) : t("adSalesNone", { spend: fmtE(s.spend) });
    return { id: a.id, name: `${a.code} · ${a.name}`, kind: a.kind, phase: a.phase, label: a.label ?? "vroeg", metric };
  };
  const running = mainAds.filter((a) => a.status !== "uit");
  const lists =
    variant === "normaal" || variant === "leeg"
      ? [
          { title: t("good"), ads: running.filter((a) => a.label === "winnaar").map(adRow) },
          { title: t("less"), ads: running.filter((a) => a.label !== "winnaar").map(adRow) },
        ].filter((l) => l.ads.length)
      : [];

  // ---------- Tip uit het playbook die past bij vandaag ----------
  const TIP_OF: Record<string, string> = { verliezer: "verliezer", account_schalen: "winnaar", schalen_na_verliezer: "winnaar" };
  const tipKey = variant === "dag1" ? "budget" : variant === "rapport" ? "rapport" : (cards.map((c) => TIP_OF[c.type]).find(Boolean) ?? "budget");

  return {
    variant,
    forced: !!forcedVariant,
    showVariants: ctx.demo.enabled,
    greeting: t("greeting", { name }),
    summary: onboarding ? t("summaryOnboarding") : summary,
    status: variant === "normaal" && !onboarding ? status : [],
    // Afstemmen komt na de onboarding.
    tuning: org.tuning_step < 8 && !ctx.inClient && !onboarding,
    onboarding,
    sweet,
    accounts,
    tile,
    dayOne,
    cards: shownCards,
    noCards: shownCards.length === 0 && variant !== "dag1",
    lists,
    tip: t(`tips.${tipKey}`),
  };
}

interface CardEnv {
  tt: Awaited<ReturnType<typeof getTranslations<"today">>>;
  why: string;
  tc: Awaited<ReturnType<typeof getTranslations<"cards">>>;
  ts: Awaited<ReturnType<typeof getTranslations<"ui.status">>>;
  tg: Awaited<ReturnType<typeof getTranslations<"gates">>>;
  name: string;
  plan: AppContext["plan"];
  ctx: AppContext;
  adById: Map<string, Ad>;
  accountOf: (id: string) => string;
  tgt: ReturnType<typeof targets>;
  fmtE: (n: number) => string;
}

const n = (v: unknown) => Number(v ?? 0);

async function cardFor(r: Recommendation, e: CardEnv): Promise<CardVM | null> {
  const { tc, ts, tg, name, fmtE } = e;
  const p = r.payload;
  const badge = r.severity === "info" ? undefined : { kind: r.severity as StatusKind, label: ts(r.severity) };
  const ad = r.ad_id ? e.adById.get(r.ad_id) : undefined;
  const adName = String(p.ad_name ?? ad?.name ?? "");
  const ai = hasAI(e.plan);
  const gateStudio: CardButton["gate"] = { plan: PLAN_NAME.pro, text: tg("studio") };
  const base = { id: r.id, type: r.type, badge };
  switch (r.type) {
    case "verliezer": {
      const sales = p.goal !== "aanvragen";
      const spend = n(p.spend);
      const target = n(p.target);
      const limit = n(p.limit);
      const state = spend > limit ? tc("verliezer.passed") : tc("verliezer.reached");
      return {
        ...base,
        title: tc(sales ? "verliezer.titleSales" : "verliezer.titleLeads", { name, ad: adName, spend: fmtE(spend) }),
        stats: [
          { label: tc("verliezer.statSpent"), value: fmtE(spend) },
          { label: tc(sales ? "verliezer.statSales" : "verliezer.statLeads"), value: "0" },
          { label: tc("verliezer.statLimit", { target: formatEuro(target) }), value: formatEuro(limit) },
        ],
        text: tc("verliezer.text"),
        explain: tc.markup(sales ? "verliezer.explainSales" : "verliezer.explainLeads", {
          target: formatEuro(target),
          limit: formatEuro(limit),
          state,
          term: (c) => `<term>${c}</term>`,
        }),
        why: {
          lines: sales
            ? [
                tc("verliezer.whySales1", { aov: fmtE(e.tgt.aov), margin: pct(e.tgt.margin), target: formatEuro(target) }),
                tc("verliezer.whySales2", { target: formatEuro(target), limit: formatEuro(limit), spend: fmtE(spend) }),
              ]
            : [
                tc("verliezer.whyLeads1", { target: formatEuro(target) }),
                tc("verliezer.whyLeads2", { target: formatEuro(target), limit: formatEuro(limit), spend: fmtE(spend) }),
              ],
          lesson: { label: tc("verliezer.whyLesson"), href: "/academy/winnaars-en-verliezers" },
        },
        tip: e.tt("tips.verliezer"),
        primary: { label: tc("verliezer.button"), kind: "apply", toast: tc("verliezer.toast", { ad: adName }) },
        later: true,
      };
    }
    case "schalen_na_verliezer": {
      const to = formatEuro(n(p.budget_to));
      return {
        ...base,
        title: tc("schalen_na_verliezer.title", {
          roas: formatRoas(n(p.roas_without)),
          be: formatRoas(n(p.break_even)),
          from: formatEuro(n(p.budget_from)),
          to,
        }),
        explain: tc("schalen_na_verliezer.explain", { spend: fmtE(n(p.spend_without)), revenue: fmtE(n(p.revenue)), step: pct(n(p.step)) }),
        primary: { label: tc("schalen_na_verliezer.button", { to }), kind: "apply", toast: tc("schalen_na_verliezer.toast", { to }) },
        secondary: r.campaign_id ? [{ label: e.why, kind: "link", href: `/campagnes/${r.campaign_id}` }] : undefined,
        later: true,
      };
    }
    case "extra_buiten_app":
      return {
        ...base,
        title: tc("extra_buiten_app.title", { ad: adName }),
        warning: tc("extra_buiten_app.warn"),
        primary: { label: tc("extra_buiten_app.button"), kind: "apply", toast: tc("extra_buiten_app.toast") },
        secondary: [{ label: tc("extra_buiten_app.keep"), kind: "decide", decision: "zo-laten", toast: tc("extra_buiten_app.toastKeep") }],
        later: false,
      };
    case "video_beter":
      return {
        ...base,
        title: tc("video_beter.title", { video: formatRoas(n(p.roas_video)), photo: formatRoas(n(p.roas_foto)) }),
        explain: tc("video_beter.explain"),
        // Starter: geen AI-knoppen.
        primary: ai
          ? { label: tc("video_beter.script"), kind: "link", href: "/studio" }
          : { label: tc("video_beter.upload"), kind: "link", href: "/advertenties/toevoegen" },
        secondary: ai ? [{ label: tc("video_beter.upload"), kind: "link", href: "/advertenties/toevoegen" }] : [],
        later: true,
      };
    case "speciaal_moment":
      return {
        ...base,
        title: tc("speciaal_moment.title", { weeks: String(p.weeks ?? "") }),
        tip: tc("speciaal_moment.tip"),
        primary: { label: tc("speciaal_moment.button"), kind: "link", href: "/campagnes/nieuw?strategie=feest" },
        later: true,
      };
    case "vermoeidheid":
      return {
        ...base,
        title: tc("vermoeidheid.title", {
          from: `${formatNumber(n(p.ctr_from), 1)}%`,
          to: `${formatNumber(n(p.ctr_to), 1)}%`,
          freq: formatNumber(n(p.frequency), 1),
        }),
        tip: tc("vermoeidheid.tip"),
        primary: { label: tc("vermoeidheid.button"), kind: "link", href: r.ad_id ? `/advertenties?advertentie=${r.ad_id}` : "/advertenties" },
        later: true,
      };
    case "betaalprobleem":
      return {
        ...base,
        title: tc("betaalprobleem.title"),
        explain: tc("betaalprobleem.explain"),
        primary: { label: tc("betaalprobleem.button"), kind: "link", href: "/hulp" },
        later: true,
      };
    case "beste_video":
      return {
        ...base,
        title: tc("beste_video.title", { ad: adName }),
        explain: tc("beste_video.explain", { cpl: formatEuro(n(p.cpl), 2), target: formatEuro(n(p.target)) }),
        primary: { label: tc("beste_video.upload"), kind: "link", href: "/advertenties/maken" },
        secondary: [
          ai
            ? { label: tc("beste_video.script"), kind: "link", href: "/studio" }
            : { label: tc("beste_video.script"), kind: "gate", gate: gateStudio, locked: true },
        ],
        later: true,
      };
    case "account_onder_break_even": {
      const account = String(p.account ?? e.accountOf(r.ad_account_id ?? ""));
      const isAct = r.severity === "act";
      return {
        ...base,
        title: isAct
          ? tc("account_onder_break_even.titleAct", { name, account, spend: fmtE(n(p.spend)), revenue: fmtE(n(p.revenue)) })
          : tc("account_onder_break_even.titleWarn", { account, roas: formatRoas(n(p.roas), 2), be: formatRoas(n(p.break_even), 2) }),
        stats: isAct
          ? [
              { label: tc("account_onder_break_even.statRoas"), value: formatRoas(n(p.roas), 2) },
              { label: tc("account_onder_break_even.statBe"), value: formatRoas(n(p.break_even), 2) },
              { label: tc("account_onder_break_even.statSales"), value: formatNumber(n(p.sales)) },
            ]
          : undefined,
        explain: isAct
          ? p.note
            ? tc("account_onder_break_even.explainNote", { margin: pct(n(p.margin)), be: formatRoas(n(p.break_even), 2), note: String(p.note) })
            : tc("account_onder_break_even.explain", { margin: pct(n(p.margin)), be: formatRoas(n(p.break_even), 2) })
          : undefined,
        primary: { label: tc("account_onder_break_even.button", { account }), kind: "account", accountId: r.ad_account_id ?? undefined },
        later: true,
      };
    }
    case "account_schalen": {
      const account = String(p.account ?? e.accountOf(r.ad_account_id ?? ""));
      const step = pct(n(p.step));
      return {
        ...base,
        title: tc("account_schalen.title", { account, roas: formatRoas(n(p.roas), 2), be: formatRoas(n(p.break_even), 2) }),
        explain: tc("account_schalen.explain", { step }),
        primary: { label: tc("account_schalen.button", { step }), kind: "apply", toast: tc("account_schalen.toast", { account, step }) },
        later: true,
      };
    }
    default:
      return null;
  }
}
