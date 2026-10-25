// Van Meta naar AdSweet: statussen, doelen en cijfers. Zuivere functies, zodat ze te testen zijn.
// Aankopen tellen als `purchase` en omzet uit `action_values` `purchase`, aanvragen als `lead`, zoals in de
// bestaande tool van Fully Booked.

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsightRow {
  ad_id?: string;
  campaign_id?: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
}

const int = (v: string | undefined) => (v === undefined || v === "" ? null : Math.round(Number(v)));
const action = (list: MetaAction[] | undefined, type: string) => {
  const a = list?.find((x) => x.action_type === type);
  return a ? Number(a.value) : null;
};

/** Eén rij van /insights (level=ad, time_increment=1) als cijfers voor insights_daily. Niet gemeten blijft leeg. */
export function insightNumbers(r: MetaInsightRow) {
  const purchases = action(r.actions, "purchase");
  const revenue = action(r.action_values, "purchase");
  return {
    date: r.date_start,
    spend: Math.round(Number(r.spend ?? 0) * 100) / 100,
    impressions: int(r.impressions),
    reach: int(r.reach),
    clicks: int(r.clicks),
    link_clicks: int(r.inline_link_clicks),
    lpv: action(r.actions, "landing_page_view"),
    view_content: action(r.actions, "view_content"),
    add_to_cart: action(r.actions, "add_to_cart"),
    checkout: action(r.actions, "initiate_checkout"),
    purchases: purchases === null ? 0 : Math.round(purchases),
    revenue: revenue === null ? null : Math.round(revenue * 100) / 100,
    leads: Math.round(action(r.actions, "lead") ?? 0),
    video_3s: action(r.actions, "video_view"),
  };
}

export type CampaignStatus = "actief" | "gepauzeerd" | "afgelopen";

/** effective_status van Meta naar de status in AdSweet. */
export function campaignStatus(effective: string | undefined): CampaignStatus {
  const s = (effective ?? "").toUpperCase();
  if (["DELETED", "ARCHIVED"].includes(s)) return "afgelopen";
  if (s.includes("PAUSED") || s === "DISAPPROVED") return "gepauzeerd";
  return "actief";
}

export function adStatus(effective: string | undefined): "actief" | "uit" | "afgekeurd" | "in_review" {
  const s = (effective ?? "").toUpperCase();
  if (s === "DISAPPROVED") return "afgekeurd";
  if (["PENDING_REVIEW", "IN_PROCESS", "PREAPPROVED"].includes(s)) return "in_review";
  if (s.includes("PAUSED") || ["DELETED", "ARCHIVED"].includes(s)) return "uit";
  return "actief";
}

/** Het doel van een campagne uit het objective van Meta. */
export function campaignGoal(objective: string | undefined): "verkopen" | "aanvragen" | "bereik" | "volgers" {
  const o = (objective ?? "").toUpperCase();
  if (o.includes("LEAD")) return "aanvragen";
  if (o.includes("AWARENESS") || o === "REACH" || o === "BRAND_AWARENESS") return "bereik";
  if (o.includes("ENGAGEMENT") || o === "PAGE_LIKES") return "volgers";
  return "verkopen";
}

/** account_status van een advertentieaccount: 1 actief, 2 uitgeschakeld, 3 en 9 betaalprobleem. */
export function accountStatus(code: number | undefined): "actief" | "betaalprobleem" | "uitgeschakeld" {
  if (code === 3 || code === 9) return "betaalprobleem";
  if (code === 2 || code === 7 || code === 100 || code === 101) return "uitgeschakeld";
  return "actief";
}

/** Bedragen van Meta staan in centen (minor units). */
export const fromMinor = (v: string | number | undefined | null) => (v === undefined || v === null || v === "" ? null : Number(v) / 100);

/** Meta-datum (2026-12-07T10:00:00+0100) naar YYYY-MM-DD. */
export const metaDate = (v: string | undefined | null) => (v ? v.slice(0, 10) : null);

/** Een pixel meet als hij de laatste 7 dagen iets doorgaf. */
export function pixelOk(lastFired: string | undefined | null, today: string): boolean {
  if (!lastFired) return false;
  return Date.parse(`${today}T12:00:00Z`) - Date.parse(lastFired) < 7 * 86_400_000;
}
