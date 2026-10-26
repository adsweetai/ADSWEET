import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type InsightDaily } from "@adsweet/db";
import { costPer, roas } from "@adsweet/playbook";
import { formatDayMonth, formatEuro, formatNumber, formatPercent, formatRoas } from "@adsweet/ui";
import { addDays, today } from "@/lib/clock";
import { periodRange, type Period } from "@/lib/period";
import { getDb } from "./auth";
import { inAccount, isLive } from "./campaigns";
import type { AppContext } from "./context";
import { goalFor, goalKind, mainCampaign, sumRows, targets, totalsPerAd } from "./metrics";

// Inzichten (App.dc.html#inzichten): alle cijfers uit Meta, berekend uit insights_daily. Wat Meta (nog) niet
// doorgaf, blijft "[uit Meta]". Vanaf fase 13 vult de nachtelijke synchronisatie alles aan.

export type Tone = "ink" | "ok" | "act" | "warn";
export interface Tile {
  k: string;
  v: string;
  sub?: string;
  series?: number[];
  tone?: Tone;
  big?: boolean;
}

export interface InsightsVM {
  kind: "sales" | "leads" | "none";
  periodLabel: string;
  top: Tile[];
  traffic: Tile[];
  funnel: { k: string; v: string; cost: string; rate: string | null; width: number; phase: number }[];
  creative: Tile[];
  delivery: Tile[];
  campaigns: {
    name: string;
    status: string;
    live: boolean;
    spend: string;
    rev: string;
    roas: string;
    roasTone: Tone;
    impr: string;
    clicks: string;
    ctr: string;
    cpc: string;
    conv: string;
  }[];
  trends: { k: string; v: string; series: number[]; spend: number[]; days: string[]; ref: number | null; tone: Tone; format: "roas" | "euro" | "pct" }[];
  rangeLabel: string;
  formats: { n: string; v: string; width: number }[];
  hasData: boolean;
  mainCampaignId: string | null;
}

const U = "[uit Meta]";
const sum = (rows: InsightDaily[], k: keyof InsightDaily) => {
  let any = false;
  let s = 0;
  for (const r of rows) {
    const v = r[k];
    if (v !== null && v !== undefined) {
      any = true;
      s += Number(v);
    }
  }
  return any ? s : null;
};
const div = (a: number | null, b: number | null) => (a !== null && b ? a / b : null);

export async function loadInsights(ctx: AppContext, period: Period): Promise<InsightsVM> {
  const t = await getTranslations("insights");
  const tc = await getTranslations("campaigns.status");
  const db = await getDb();
  const [campaigns, goals, ads, rowsAll] = await Promise.all([
    db.from("campaigns").select().eq("organization_id", ctx.org.id).then(must),
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("ads").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("organization_id", ctx.org.id).order("date").then(must),
  ]);
  const mine = campaigns.filter((c) => inAccount(ctx, c));
  const ids = new Set(mine.map((c) => c.id));
  const goal = goalFor(goals, ctx.account?.id);
  const main = mainCampaign(mine.filter(isLive), goal);
  const kind = goalKind(goal, main);
  const tg = targets(goal);
  const day = today();
  const range = periodRange(period, day, main?.start_date ?? null);
  const rows = rowsAll.filter((r) => ids.has(r.campaign_id) && r.date >= range.from && r.date <= range.to);
  const liveIds = new Set(mine.filter(isLive).map((c) => c.id));
  const live = rows.filter((r) => liveIds.has(r.campaign_id));
  const tot = sumRows(live);

  // Per dag (voor de sparklines en de trends)
  const days: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) days.push(d);
  const perDay = days.map((d) => live.filter((r) => r.date === d));
  const series = (f: (rs: InsightDaily[]) => number | null) => perDay.map((rs) => f(rs) ?? 0);
  const spendS = series((rs) => sum(rs, "spend"));
  const revS = series((rs) => sum(rs, "revenue"));
  const resS = series((rs) => sum(rs, kind === "leads" ? "leads" : "purchases"));

  const impressions = sum(live, "impressions");
  const reach = sum(live, "reach");
  const clicks = sum(live, "clicks");
  const linkClicks = sum(live, "link_clicks");
  const lpv = sum(live, "lpv");
  const view = sum(live, "view_content");
  const cart = sum(live, "add_to_cart");
  const checkout = sum(live, "checkout");
  const v3 = sum(live, "video_3s");
  const thru = sum(live, "video_thruplay");
  const results = kind === "leads" ? tot.leads : tot.purchases;
  const r = roas(tot.revenue, tot.spend);
  const cpa = costPer(tot.spend, results);
  const eur2 = (n: number | null) => (n === null ? U : formatEuro(n, 2));
  const num = (n: number | null) => (n === null ? U : formatNumber(n));
  const pct = (n: number | null, d = 1) => (n === null ? U : formatPercent(n, d));
  const has = live.some((x) => Number(x.spend) > 0);

  const top: Tile[] =
    kind === "leads"
      ? [
          { k: t("spend"), v: formatEuro(tot.spend, 2), series: spendS, tone: "ink", big: true },
          { k: t("leads"), v: formatNumber(tot.leads), series: resS, tone: "ok", big: true },
          {
            k: t("cpl"),
            v: cpa === null ? U : formatEuro(cpa, 2),
            sub: tg.cpl ? t("goalIs", { v: formatEuro(tg.cpl) }) : undefined,
            series: series((rs) => costPer(sum(rs, "spend") ?? 0, sum(rs, "leads") ?? 0)),
            tone: "act",
            big: true,
          },
        ]
      : [
          { k: t("spend"), v: formatEuro(tot.spend, 2), series: spendS, tone: "ink", big: true },
          { k: t("revenue"), v: formatEuro(tot.revenue, 2), series: revS, tone: "ok", big: true },
          {
            k: t("roas"),
            v: formatRoas(r),
            sub: tg.roasTarget ? t("breakEven", { v: formatRoas(tg.roasTarget) }) : undefined,
            series: series((rs) => roas(sum(rs, "revenue") ?? 0, sum(rs, "spend") ?? 0)),
            tone: "ok",
            big: true,
          },
          {
            k: t("cpa"),
            v: cpa === null ? U : formatEuro(cpa, 2),
            sub: tg.maxCpa ? t("maxIs", { v: formatEuro(tg.maxCpa, 2) }) : undefined,
            series: series((rs) => costPer(sum(rs, "spend") ?? 0, sum(rs, "purchases") ?? 0)),
            tone: "act",
            big: true,
          },
        ];

  const traffic: Tile[] = [
    { k: t("linkClicks"), v: num(linkClicks) },
    { k: t("cpc"), v: eur2(div(tot.spend, linkClicks)) },
    { k: t("lpv"), v: num(lpv) },
    { k: t("costPerLpv"), v: eur2(div(tot.spend, lpv)) },
    { k: t("landingRate"), v: pct(div(lpv, linkClicks)), sub: t("landingRateSub") },
  ];

  const steps: [string, number | null, string][] =
    kind === "sales"
      ? [
          [t("funnelView"), view, "perView"],
          [t("funnelCart"), cart, "perCart"],
          [t("funnelCheckout"), checkout, "perCheckout"],
          [t("funnelSales"), tot.purchases, "perSale"],
        ]
      : [
          [t("funnelLpv"), lpv, "perView"],
          [t("funnelLeads"), tot.leads, "perLead"],
        ];
  const firstN = steps[0][1] ?? 0;
  const funnel = steps.map(([k, n], i) => {
    const prev = i ? steps[i - 1][1] : null;
    return {
      k,
      v: num(n),
      cost: n ? t(`cost.${steps[i][2]}`, { v: formatEuro(tot.spend / n, 2) }) : U,
      rate: i && prev && n !== null ? t("wentOn", { v: formatPercent(n / prev, 1) }) : null,
      width: n && firstN ? Math.max(8, Math.round((n / firstN) * 100)) : 8,
      phase: i,
    };
  });

  const creative: Tile[] = [
    {
      k: t("hookRate"),
      v: pct(div(v3, impressions)),
      sub: t("hookRateSub"),
      series: series((rs) => div(sum(rs, "video_3s"), sum(rs, "impressions"))),
      tone: "ok",
    },
    { k: t("holdRate"), v: pct(div(thru, impressions)), series: series((rs) => div(sum(rs, "video_thruplay"), sum(rs, "impressions"))), tone: "warn" },
    { k: t("linkCtr"), v: pct(div(linkClicks, impressions), 2), series: series((rs) => div(sum(rs, "link_clicks"), sum(rs, "impressions"))), tone: "ok" },
    { k: t("ctrAll"), v: pct(div(clicks, impressions), 2), series: series((rs) => div(sum(rs, "clicks"), sum(rs, "impressions"))), tone: "ok" },
    { k: t("cpcLink"), v: eur2(div(tot.spend, linkClicks)), series: series((rs) => div(sum(rs, "spend"), sum(rs, "link_clicks"))), tone: "ink" },
  ];
  const freq = div(impressions, reach);
  const delivery: Tile[] = [
    {
      k: t("cpm"),
      v: eur2(impressions ? (tot.spend / impressions) * 1000 : null),
      series: series((rs) => (sum(rs, "impressions") ? ((sum(rs, "spend") ?? 0) / (sum(rs, "impressions") ?? 1)) * 1000 : 0)),
      tone: "ok",
    },
    {
      k: t("frequency"),
      v: freq === null ? U : formatNumber(freq, 1),
      sub: t("frequencySub"),
      series: series((rs) => div(sum(rs, "impressions"), sum(rs, "reach"))),
      tone: "ink",
    },
    { k: t("reach"), v: num(reach), series: series((rs) => sum(rs, "reach")), tone: "ok" },
    { k: t("impressions"), v: num(impressions), series: series((rs) => sum(rs, "impressions")), tone: "ink" },
    { k: t("thumbStop"), v: U, tone: "warn" },
  ];

  const camps = mine
    .filter((c) => !c.outside_adsweet || rowsAll.some((x) => x.campaign_id === c.id))
    .map((c) => {
      const rs = rowsAll.filter((x) => x.campaign_id === c.id && (!isLive(c) || (x.date >= range.from && x.date <= range.to)));
      const s = sumRows(rs);
      const imp = sum(rs, "impressions");
      const lc = sum(rs, "link_clicks");
      const cr = roas(s.revenue, s.spend);
      const st = tg.roasTarget ? (cr >= tg.roasTarget ? "ok" : "warn") : "ink";
      return {
        name: c.name,
        status: tc(c.status),
        live: isLive(c),
        spend: formatEuro(s.spend, 2),
        rev: kind === "sales" ? formatEuro(s.revenue, 2) : "–",
        roas: kind === "sales" && s.spend ? formatRoas(cr, 2) : "–",
        roasTone: st as Tone,
        impr: imp === null ? "–" : imp >= 10000 ? `${formatNumber(imp / 1000, 1)}k` : formatNumber(imp),
        clicks: lc === null ? "–" : formatNumber(lc),
        ctr: lc !== null && imp ? formatPercent(lc / imp, 2) : "–",
        cpc: lc ? formatEuro(s.spend / lc, 2) : "–",
        conv: formatNumber(kind === "leads" ? s.leads : s.purchases),
      };
    })
    .filter((c) => c.spend !== "€0,00" || c.live);

  const labels = days.map((d) => formatDayMonth(d).replace(/ (\w{3})\w*$/, " $1"));
  const trends: InsightsVM["trends"] =
    kind === "sales"
      ? [
          {
            k: t("roas"),
            v: formatRoas(r),
            series: series((rs) => roas(sum(rs, "revenue") ?? 0, sum(rs, "spend") ?? 0)),
            spend: spendS,
            days: labels,
            ref: tg.roasTarget,
            tone: "ok",
            format: "roas",
          },
          {
            k: t("cpa"),
            v: cpa === null ? U : formatEuro(cpa, 2),
            series: series((rs) => costPer(sum(rs, "spend") ?? 0, sum(rs, "purchases") ?? 0)),
            spend: spendS,
            days: labels,
            ref: null,
            tone: "act",
            format: "euro",
          },
          {
            k: t("linkCtr"),
            v: pct(div(linkClicks, impressions), 2),
            series: series((rs) => (div(sum(rs, "link_clicks"), sum(rs, "impressions")) ?? 0) * 100),
            spend: spendS,
            days: labels,
            ref: null,
            tone: "ink",
            format: "pct",
          },
          { k: t("revenue"), v: formatEuro(tot.revenue, 2), series: revS, spend: spendS, days: labels, ref: null, tone: "ok", format: "euro" },
        ]
      : [
          {
            k: t("cpl"),
            v: cpa === null ? U : formatEuro(cpa, 2),
            series: series((rs) => costPer(sum(rs, "spend") ?? 0, sum(rs, "leads") ?? 0)),
            spend: spendS,
            days: labels,
            ref: tg.cpl,
            tone: "act",
            format: "euro",
          },
          { k: t("leads"), v: formatNumber(tot.leads), series: resS, spend: spendS, days: labels, ref: null, tone: "ok", format: "roas" },
        ];

  // Video tegenover foto
  const perAd = totalsPerAd(rows);
  const byKind = (k: "video" | "foto") => {
    const s = ads
      .filter((a) => a.kind === k && ids.has(a.campaign_id))
      .reduce(
        (acc, a) => {
          const x = perAd.get(a.id);
          return x ? { spend: acc.spend + x.spend, revenue: acc.revenue + x.revenue, leads: acc.leads + x.leads } : acc;
        },
        { spend: 0, revenue: 0, leads: 0 },
      );
    return s;
  };
  const vid = byKind("video");
  const pho = byKind("foto");
  const fmtFormat = (x: { spend: number; revenue: number; leads: number }) =>
    kind === "leads"
      ? t("formatLeads", { spend: formatEuro(x.spend), n: x.leads })
      : t("formatSales", { spend: formatEuro(x.spend), rev: formatEuro(x.revenue), roas: formatRoas(roas(x.revenue, x.spend), 2) });
  const vr = kind === "leads" ? (vid.leads ? vid.spend / vid.leads : 0) : roas(vid.revenue, vid.spend);
  const pr = kind === "leads" ? (pho.leads ? pho.spend / pho.leads : 0) : roas(pho.revenue, pho.spend);
  const best = Math.max(vr, pr) || 1;
  const formats =
    vid.spend || pho.spend
      ? [
          { n: t("video"), v: fmtFormat(vid), width: Math.round((vr / best) * 100) },
          { n: t("photo"), v: fmtFormat(pho), width: Math.round((pr / best) * 100) },
        ]
      : [];

  return {
    kind,
    periodLabel: t(`period.${period}`),
    top,
    traffic,
    funnel,
    creative,
    delivery,
    campaigns: camps,
    trends,
    rangeLabel: t("range", { from: formatDayMonth(range.from), to: formatDayMonth(range.to) }),
    formats,
    hasData: has,
    mainCampaignId: main?.id ?? null,
  };
}
