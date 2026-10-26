import "server-only";
import { must, type Ad, type Campaign, type Db, type Goal, type InsightDaily, type OrgKind } from "@adsweet/db";
import { breakEvenRoas, costPer, leadsStatus, maxCostPerSale, roas, salesStatus, type Status } from "@adsweet/playbook";

export interface Totals {
  spend: number;
  purchases: number;
  revenue: number;
  leads: number;
  impressions: number | null;
  clicks: number | null;
  linkClicks: number | null;
  reach: number | null;
  followers: number | null;
}

const empty = (): Totals => ({ spend: 0, purchases: 0, revenue: 0, leads: 0, impressions: null, clicks: null, linkClicks: null, reach: null, followers: null });
const addN = (a: number | null, b: number | null) => (b === null || b === undefined ? a : (a ?? 0) + Number(b));

export function sumRows(rows: InsightDaily[]): Totals {
  const t = empty();
  for (const r of rows) {
    t.spend += Number(r.spend);
    t.purchases += Number(r.purchases ?? 0);
    t.revenue += Number(r.revenue ?? 0);
    t.leads += Number(r.leads ?? 0);
    t.impressions = addN(t.impressions, r.impressions);
    t.clicks = addN(t.clicks, r.clicks);
    t.linkClicks = addN(t.linkClicks, r.link_clicks);
    t.reach = addN(t.reach, r.reach);
    t.followers = addN(t.followers, r.followers);
  }
  t.spend = Math.round(t.spend * 100) / 100;
  t.revenue = Math.round(t.revenue * 100) / 100;
  return t;
}

export async function insightRows(db: Db, orgId: string, range?: { from: string; to: string }): Promise<InsightDaily[]> {
  let q = db.from("insights_daily").select().eq("organization_id", orgId);
  if (range) q = q.gte("date", range.from).lte("date", range.to);
  return must(await q.order("date"));
}

/** Het doel dat geldt voor een advertentieaccount (of de organisatie). */
export function goalFor(goals: Goal[], adAccountId: string | null | undefined): Goal | null {
  return goals.find((g) => g.ad_account_id === adAccountId) ?? goals.find((g) => !g.ad_account_id) ?? goals[0] ?? null;
}

/**
 * De campagne waarop het dashboard zijn cijfers afstemt, uit de campagnes die lopen. Bij een doel verkopen of aanvragen
 * eerst een campagne met dat doel (een account met ook een campagne voor volgers toont dan toch verkopen), dan de
 * vaste, dan de eerste.
 */
export function mainCampaign(live: Campaign[], goal: Goal | null): Campaign | null {
  const want = goal?.type === "verkopen" ? "verkopen" : goal?.type === "aanvragen" || goal?.type === "zaak" ? "aanvragen" : null;
  const byGoal = want ? (live.find((c) => c.kind === "vast" && c.goal === want) ?? live.find((c) => c.goal === want)) : undefined;
  return byGoal ?? live.find((c) => c.kind === "vast") ?? live[0] ?? null;
}

/** Het doel dat bij een soort zaak hoort, als er nog geen doel is: een webshop verkoopt, een dienstverlener wil aanvragen. */
export function goalTypeForKind(kind: OrgKind): Goal["type"] | null {
  if (kind === "webshop") return "verkopen";
  if (kind === "dienstverlener") return "aanvragen";
  if (kind === "lokaal") return "zaak";
  return null;
}

export type GoalKind = "sales" | "leads" | "none";
export function goalKind(goal: Goal | null, campaign?: Campaign | null): GoalKind {
  if (campaign && ["volgers", "bereik", "evenement"].includes(campaign.goal)) return "none";
  if (!goal) return "none";
  if (goal.type === "verkopen") return "sales";
  if (goal.type === "aanvragen" || (goal.type === "zaak" && goal.zaak_mode !== "bekendheid")) return "leads";
  return "none";
}

/** Doelwaarde: break-even (of doel-ROAS) voor verkopen, doel per aanvraag voor aanvragen. */
export function targets(goal: Goal | null) {
  const margin = Number(goal?.margin ?? 0);
  const be = margin > 0 ? breakEvenRoas(margin) : null;
  return {
    margin,
    aov: Number(goal?.aov ?? 0),
    breakEven: be,
    roasTarget: goal?.target_roas ? Number(goal.target_roas) : be,
    maxCpa: goal?.aov && margin ? maxCostPerSale(Number(goal.aov), margin) : null,
    cpl: goal?.target_cpl ? Number(goal.target_cpl) : null,
  };
}

export function statusFor(kind: GoalKind, t: Totals, goal: Goal | null): Status | null {
  const tg = targets(goal);
  if (kind === "sales" && tg.roasTarget) return salesStatus(roas(t.revenue, t.spend), tg.roasTarget);
  if (kind === "leads" && tg.cpl) return leadsStatus(costPer(t.spend, t.leads), tg.cpl);
  return null;
}

/** Totalen per advertentie. */
export function totalsPerAd(rows: InsightDaily[]): Map<string, Totals> {
  const by = new Map<string, InsightDaily[]>();
  for (const r of rows) {
    if (!r.ad_id) continue;
    by.set(r.ad_id, [...(by.get(r.ad_id) ?? []), r]);
  }
  return new Map([...by].map(([k, v]) => [k, sumRows(v)]));
}

export function totalsForCampaigns(rows: InsightDaily[], campaignIds: Set<string>): Totals {
  return sumRows(rows.filter((r) => campaignIds.has(r.campaign_id)));
}

export const ADS_ORDER = (a: Ad, b: Ad) => a.code.localeCompare(b.code, "nl", { numeric: true });
