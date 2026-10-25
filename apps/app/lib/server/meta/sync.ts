import "server-only";
import { must, type Ad, type AdSet, type Campaign, type Goal } from "@adsweet/db";
import { labelAd, leadMax, type Label } from "@adsweet/playbook";
import { addDays, nowIso, today } from "@/lib/clock";
import { serviceDb } from "../auth";
import { goalFor, goalKind, sumRows, totalsPerAd } from "../metrics";
import { metaAccountInfo } from "./assets";
import { graphAll, withMetaToken } from "./graph";
import { accountStatus, adStatus, campaignGoal, campaignStatus, fromMinor, insightNumbers, metaDate, type MetaInsightRow } from "./map";
import { userMetaToken } from "./tokens";

// Haalt de campagnes, ad sets, advertenties en de cijfers per dag van een advertentieaccount op uit Meta. AdSweet
// wijzigt hier niets bij Meta: dit is alleen lezen. Campagnes die niet uit AdSweet komen, krijgen "buiten AdSweet".

const LIVE = JSON.stringify([
  "ACTIVE",
  "PAUSED",
  "CAMPAIGN_PAUSED",
  "ADSET_PAUSED",
  "PENDING_REVIEW",
  "DISAPPROVED",
  "IN_PROCESS",
  "WITH_ISSUES",
  "PREAPPROVED",
]);

export interface SyncResult {
  campaigns: number;
  adSets: number;
  ads: number;
  days: number;
  rows: number;
}

/** Synchroniseert één advertentieaccount (onze id). `days`: hoeveel dagen cijfers, tot en met gisteren. */
export async function syncMetaAccount(orgId: string, adAccountId: string, days = 30): Promise<SyncResult> {
  // Met de sleutel van wie de koppeling maakte ("Doorgaan met Facebook"); anders die van de systeemgebruiker.
  const conn = must(
    await serviceDb()
      .from("connections")
      .select("meta_token_user")
      .eq("organization_id", orgId)
      .eq("provider", "meta")
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  return withMetaToken(await userMetaToken(conn?.meta_token_user), () => syncWith(orgId, adAccountId, days));
}

async function syncWith(orgId: string, adAccountId: string, days: number): Promise<SyncResult> {
  const svc = serviceDb();
  const acc = must(await svc.from("ad_accounts").select().eq("id", adAccountId).eq("organization_id", orgId).single());
  const act = acc.meta_ad_account_id;
  if (!act || !/^act_\d+$/.test(act)) throw new Error("Dit advertentieaccount is niet met Meta gekoppeld.");

  // Het account zelf: naam, munt en of Meta kan afschrijven.
  const info = await metaAccountInfo(act);
  const st = accountStatus(info.account_status);
  await svc
    .from("ad_accounts")
    .update({ status: st, payment_method_ok: st !== "betaalprobleem", currency: info.currency ?? acc.currency, timezone: info.timezone_name ?? acc.timezone })
    .eq("id", acc.id);

  // Campagnes
  const metaCampaigns = await graphAll<{
    id: string;
    name: string;
    objective?: string;
    effective_status?: string;
    daily_budget?: string;
    start_time?: string;
    stop_time?: string;
    created_time?: string;
  }>(`${act}/campaigns`, { fields: "id,name,objective,effective_status,daily_budget,start_time,stop_time,created_time", effective_status: LIVE, limit: 200 });
  const existingCampaigns = must(await svc.from("campaigns").select().eq("organization_id", orgId));
  const campaignByMeta = new Map(existingCampaigns.filter((c) => c.meta_id).map((c) => [c.meta_id!, c]));
  for (const m of metaCampaigns) {
    const budget = fromMinor(m.daily_budget);
    const row = {
      name: m.name,
      status: campaignStatus(m.effective_status),
      daily_budget: budget,
      budget_level: budget ? ("campagne" as const) : ("adset" as const),
      start_date: metaDate(m.start_time),
      end_date: metaDate(m.stop_time),
    };
    const found = campaignByMeta.get(m.id);
    if (found) {
      await svc.from("campaigns").update(row).eq("id", found.id);
      campaignByMeta.set(m.id, { ...found, ...row });
    } else {
      const created = must(
        await svc
          .from("campaigns")
          .insert({
            organization_id: orgId,
            ad_account_id: acc.id,
            meta_id: m.id,
            kind: "vast",
            goal: campaignGoal(m.objective),
            channel: "meta",
            outside_adsweet: true,
            launched_at: m.created_time ?? null,
            ...row,
          })
          .select()
          .single(),
      );
      campaignByMeta.set(m.id, created);
    }
  }

  // Ad sets: lopende ad sets krijgen het slotje, AdSweet raakt ze niet aan.
  const metaSets = await graphAll<{ id: string; name: string; campaign_id: string; effective_status?: string; daily_budget?: string; start_time?: string }>(
    `${act}/adsets`,
    { fields: "id,name,campaign_id,effective_status,daily_budget,start_time", effective_status: LIVE, limit: 500 },
  );
  const campaignIds = [...campaignByMeta.values()].map((c) => c.id);
  const existingSets: AdSet[] = campaignIds.length ? must(await svc.from("ad_sets").select().in("campaign_id", campaignIds)) : [];
  const setByMeta = new Map(existingSets.filter((s) => s.meta_id).map((s) => [s.meta_id!, s]));
  for (const m of metaSets) {
    const campaign = campaignByMeta.get(m.campaign_id);
    if (!campaign) continue;
    const status = campaignStatus(m.effective_status);
    const row = { name: m.name, status, daily_budget: fromMinor(m.daily_budget), start_date: metaDate(m.start_time), locked: status === "actief" };
    const found = setByMeta.get(m.id);
    if (found) await svc.from("ad_sets").update(row).eq("id", found.id);
    else
      setByMeta.set(
        m.id,
        must(
          await svc
            .from("ad_sets")
            .insert({ organization_id: orgId, campaign_id: campaign.id, meta_id: m.id, learning: false, ...row })
            .select()
            .single(),
        ),
      );
  }

  // Advertenties
  const metaAds = await graphAll<{
    id: string;
    name: string;
    adset_id: string;
    campaign_id: string;
    effective_status?: string;
    created_time?: string;
    creative?: { object_type?: string; video_id?: string };
  }>(`${act}/ads`, { fields: "id,name,adset_id,campaign_id,effective_status,created_time,creative{object_type,video_id}", effective_status: LIVE, limit: 500 });
  const existingAds: Ad[] = campaignIds.length ? must(await svc.from("ads").select().in("campaign_id", campaignIds)) : [];
  const adByMeta = new Map(existingAds.filter((a) => a.meta_id).map((a) => [a.meta_id!, a]));
  const codesPerCampaign = new Map<string, number>();
  for (const a of existingAds) codesPerCampaign.set(a.campaign_id, (codesPerCampaign.get(a.campaign_id) ?? 0) + 1);
  for (const m of [...metaAds].sort((a, b) => (a.created_time ?? "").localeCompare(b.created_time ?? ""))) {
    const campaign = campaignByMeta.get(m.campaign_id);
    const set = setByMeta.get(m.adset_id);
    if (!campaign || !set) continue;
    const status = adStatus(m.effective_status);
    const row = {
      name: m.name,
      status,
      review_status: status === "afgekeurd" ? ("afgekeurd" as const) : status === "in_review" ? ("wordt_nagekeken" as const) : ("goedgekeurd" as const),
    };
    const found = adByMeta.get(m.id);
    if (found) {
      await svc.from("ads").update(row).eq("id", found.id);
      continue;
    }
    const n = (codesPerCampaign.get(campaign.id) ?? 0) + 1;
    codesPerCampaign.set(campaign.id, n);
    adByMeta.set(
      m.id,
      must(
        await svc
          .from("ads")
          .insert({
            organization_id: orgId,
            campaign_id: campaign.id,
            ad_set_id: set.id,
            meta_id: m.id,
            code: `A${n}`,
            kind: m.creative?.object_type === "VIDEO" || m.creative?.video_id ? "video" : "foto",
            // De funnelfase kent Meta niet; je zet ze zelf in AdSweet.
            phase: "top",
            started_at: metaDate(m.created_time),
            ...row,
          })
          .select()
          .single(),
      ),
    );
  }

  // Cijfers per dag, tot en met gisteren. Wat er al stond voor die dagen, vervangen we.
  const until = addDays(today(), -1);
  const since = addDays(until, -(days - 1));
  const insights = await graphAll<MetaInsightRow>(
    `${act}/insights`,
    {
      level: "ad",
      time_increment: 1,
      time_range: { since, until },
      fields: "ad_id,campaign_id,date_start,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values",
      limit: 500,
    },
    80,
  );
  const allCampaignIds = [...campaignByMeta.values()].map((c) => c.id);
  if (allCampaignIds.length)
    await svc.from("insights_daily").delete().eq("organization_id", orgId).gte("date", since).lte("date", until).in("campaign_id", allCampaignIds);
  const rows: Record<string, unknown>[] = [];
  const campaignOnly = new Map<string, ReturnType<typeof insightNumbers> & { campaign_id: string }>();
  for (const r of insights) {
    const campaign = r.campaign_id ? campaignByMeta.get(r.campaign_id) : undefined;
    if (!campaign) continue;
    const n = insightNumbers(r);
    const ad = r.ad_id ? adByMeta.get(r.ad_id) : undefined;
    if (ad) rows.push({ organization_id: orgId, campaign_id: campaign.id, ad_id: ad.id, ...n });
    else {
      // Advertentie die we niet (meer) kennen: tel ze bij het totaal van de campagne voor die dag.
      const key = `${campaign.id}:${n.date}`;
      const prev = campaignOnly.get(key);
      campaignOnly.set(
        key,
        prev
          ? {
              ...prev,
              spend: Math.round((prev.spend + n.spend) * 100) / 100,
              purchases: prev.purchases + n.purchases,
              leads: prev.leads + n.leads,
              revenue: (prev.revenue ?? 0) + (n.revenue ?? 0) || null,
            }
          : { ...n, campaign_id: campaign.id },
      );
    }
  }
  for (const v of campaignOnly.values()) rows.push({ organization_id: orgId, ad_id: null, ...v });
  for (let i = 0; i < rows.length; i += 500) await svc.from("insights_daily").insert(rows.slice(i, i + 500) as never);

  await labelAds(orgId, acc.id, [...campaignByMeta.values()]);
  const conn = must(await svc.from("connections").select("id, details").eq("organization_id", orgId).eq("provider", "meta").maybeSingle());
  if (conn)
    await svc
      .from("connections")
      .update({ details: { ...((conn.details ?? {}) as Record<string, unknown>), last_sync: nowIso(), via: "systeemgebruiker" } as never })
      .eq("id", conn.id);
  return { campaigns: metaCampaigns.length, adSets: metaSets.length, ads: metaAds.length, days, rows: rows.length };
}

/** Winnaar, verliezer of nog te vroeg, volgens het playbook, op de cijfers van de laatste 7 dagen. */
async function labelAds(orgId: string, adAccountId: string, campaigns: Campaign[]) {
  const svc = serviceDb();
  const goals: Goal[] = must(await svc.from("goals").select().eq("organization_id", orgId));
  const goal = goalFor(goals, adAccountId);
  const ids = campaigns.map((c) => c.id);
  if (!ids.length) return;
  const until = addDays(today(), -1);
  const rows = must(
    await svc.from("insights_daily").select().eq("organization_id", orgId).gte("date", addDays(until, -6)).lte("date", until).in("campaign_id", ids),
  );
  const perAd = totalsPerAd(rows);
  const ads: Ad[] = must(await svc.from("ads").select().in("campaign_id", ids));
  for (const c of campaigns) {
    const kind = goalKind(goal, c);
    const target =
      kind === "sales" && goal?.aov && goal.margin
        ? ({ kind: "sales", aov: Number(goal.aov), margin: Number(goal.margin) } as const)
        : kind === "leads" && (goal?.target_cpl || (goal?.clv && goal.margin && goal.close_rate))
          ? ({ kind: "leads", target: Number(goal.target_cpl) || leadMax(Number(goal.clv), Number(goal.margin), Number(goal.close_rate)) } as const)
          : ({ kind: "none" } as const);
    for (const a of ads.filter((x) => x.campaign_id === c.id)) {
      const t = perAd.get(a.id) ?? sumRows([]);
      const label: Label = labelAd({ spend: t.spend, results: kind === "leads" ? t.leads : t.purchases, revenue: t.revenue }, target);
      if (label !== a.label) await svc.from("ads").update({ label }).eq("id", a.id);
    }
  }
}

/** Alle gekoppelde accounts, voor de dagelijkse taak. Fouten per account stoppen de rest niet. */
export async function syncAllMeta(days = 3): Promise<{ ok: number; failed: number }> {
  const svc = serviceDb();
  const conns = must(await svc.from("connections").select("organization_id, status").eq("provider", "meta").eq("status", "gekoppeld"));
  let ok = 0;
  let failed = 0;
  for (const orgId of new Set(conns.map((c) => c.organization_id))) {
    const accounts = must(await svc.from("ad_accounts").select("id, meta_ad_account_id").eq("organization_id", orgId));
    for (const a of accounts.filter((x) => x.meta_ad_account_id && /^act_\d+$/.test(x.meta_ad_account_id))) {
      try {
        await syncMetaAccount(orgId, a.id, days);
        ok++;
      } catch (e) {
        failed++;
        console.warn(`Meta-sync mislukt voor een account: ${(e as Error).message}`);
      }
    }
  }
  return { ok, failed };
}
