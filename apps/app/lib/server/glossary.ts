import "server-only";
import { getTranslations } from "next-intl/server";
import { must } from "@adsweet/db";
import { breakEvenRoas, costPer, maxCostPerSale, roas } from "@adsweet/playbook";
import { formatEuro, formatNumber, formatPercent, formatRoas } from "@adsweet/ui";
import { today } from "@/lib/clock";
import { periodRange } from "@/lib/period";
import { getDb } from "./auth";
import { inAccount, isLive } from "./campaigns";
import type { AppContext } from "./context";
import { goalFor, goalKind, mainCampaign, sumRows, totalsPerAd } from "./metrics";

// Uitleg bij vakwoorden: de definitie staat in nl.json, het voorbeeld rekenen we uit met je eigen cijfers.

export async function glossaryExamples(ctx: AppContext): Promise<Record<string, string>> {
  const t = await getTranslations("glossary.examples");
  const db = await getDb();
  const [goals, campaigns, ads, rows, adSets] = await Promise.all([
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("campaigns").select().eq("organization_id", ctx.org.id).then(must),
    db.from("ads").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("organization_id", ctx.org.id).then(must),
    db.from("ad_sets").select("id, campaign_id").eq("organization_id", ctx.org.id).then(must),
  ]);
  const mine = campaigns.filter((c) => inAccount(ctx, c));
  const goal = goalFor(goals, ctx.account?.id);
  const main = mainCampaign(mine.filter(isLive), goal);
  const kind = goalKind(goal, main);
  const ex: Record<string, string> = {};
  const m = Number(goal?.margin ?? 0);
  const aov = Number(goal?.aov ?? 0);
  if (kind === "sales" && m > 0) {
    const be = breakEvenRoas(m);
    ex["break-even"] = t("breakEven", { m: formatPercent(m), md: formatNumber(m, 2), be: formatRoas(be) });
    ex["doel-roas"] = goal?.target_roas ? t("roasGoal", { v: formatRoas(Number(goal.target_roas)) }) : t("roasGoalNone", { be: formatRoas(be) });
    if (aov > 0) {
      ex["max-cpa"] = t("maxCpa", { aov: formatEuro(aov), m: formatPercent(m), max: formatEuro(maxCostPerSale(aov, m), 2) });
      ex["orderwaarde"] = t("aov", { aov: formatEuro(aov) });
      ex["marge"] = t("margin", { m: formatPercent(m), aov: formatEuro(aov), left: formatEuro(maxCostPerSale(aov, m), 2) });
    }
  }
  if (kind === "leads" && goal?.target_cpl) {
    ex["break-even"] = t("breakEvenLeads", { target: formatEuro(Number(goal.target_cpl)) });
    ex["roas"] = t("roasLeads");
  }
  if (!main) return ex;
  const range = periodRange("7d", today());
  const week = rows.filter((r) => r.campaign_id === main.id && r.date >= range.from && r.date <= range.to);
  const s = sumRows(week);
  if (kind === "sales" && s.spend > 0) {
    ex["roas"] = t("roas", { rev: formatEuro(s.revenue), spend: formatEuro(s.spend), roas: formatRoas(roas(s.revenue, s.spend)) });
    if (s.purchases) ex["cpa"] = t("cpa", { spend: formatEuro(s.spend), n: s.purchases, cpa: formatEuro(costPer(s.spend, s.purchases) ?? 0, 2) });
  }
  if (kind === "leads" && s.leads)
    ex["cpl"] = t("cpl", {
      spend: formatEuro(s.spend),
      n: s.leads,
      cpl: formatEuro(costPer(s.spend, s.leads) ?? 0, 2),
      target: goal?.target_cpl ? formatEuro(Number(goal.target_cpl)) : "[doel]",
    });
  if (s.impressions && s.spend)
    ex["cpm"] = t("cpm", { spend: formatEuro(s.spend), imp: formatNumber(s.impressions), cpm: formatEuro((s.spend / s.impressions) * 1000, 2) });
  // Je beste video: CTR en frequentie
  const perAd = totalsPerAd(rows.filter((r) => r.campaign_id === main.id));
  const video = ads.filter((a) => a.campaign_id === main.id && a.kind === "video" && a.label === "winnaar").find((a) => perAd.get(a.id)?.impressions);
  const vs = video ? perAd.get(video.id) : null;
  if (vs?.impressions && vs.linkClicks !== null) {
    const ctr = vs.linkClicks / vs.impressions;
    ex["ctr"] = t("ctr", { ctr: formatPercent(ctr), per: Math.round(ctr * 1000) });
  }
  if (vs?.impressions && vs.reach) ex["freq"] = t("freq", { f: formatNumber(vs.impressions / vs.reach, 1) });
  const sets = adSets.filter((x) => x.campaign_id === main.id).length;
  const n = ads.filter((a) => a.campaign_id === main.id && a.status !== "uit").length;
  ex["adset"] = t("adset", { sets, ads: n });
  const phase = (p: "top" | "middle" | "bottom") => ads.find((a) => a.campaign_id === main.id && a.phase === p && a.status !== "uit")?.name;
  const [top, mid, bot] = [phase("top"), phase("middle"), phase("bottom")];
  if (top && mid && bot) ex["funnel"] = t("funnel", { top, middle: mid, bottom: bot });
  if (main.utm?.campaign) ex["utm"] = `utm_campaign=${main.utm.campaign}`;
  return ex;
}
