import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "@adsweet/db";
import { ORG_IDS } from "@adsweet/db/fixtures";
import { serviceDb } from "../auth";
import { syncMetaAccount } from "./sync";

// De synchronisatie met nagemaakte antwoorden van Meta, op de demodatabase (zelfde schema als Supabase).

const ORG = ORG_IDS.sarah;
let ACC = "";
const ACT = "act_4242";

const days = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"];
const META: Record<string, unknown> = {
  [ACT]: { id: ACT, name: "Salon Mila", account_status: 1, currency: "EUR", timezone_name: "Europe/Brussels" },
  [`${ACT}/campaigns`]: {
    data: [
      {
        id: "c1",
        name: "Salon Mila · Vast",
        objective: "OUTCOME_LEADS",
        effective_status: "ACTIVE",
        daily_budget: "1500",
        created_time: "2026-11-20T10:00:00+0100",
      },
    ],
  },
  [`${ACT}/adsets`]: { data: [{ id: "s1", name: "AS1", campaign_id: "c1", effective_status: "ACTIVE", start_time: "2026-11-20T10:00:00+0100" }] },
  [`${ACT}/ads`]: {
    data: [
      {
        id: "a1",
        name: "Balayage in daglicht",
        adset_id: "s1",
        campaign_id: "c1",
        effective_status: "ACTIVE",
        created_time: "2026-11-20T10:00:00+0100",
        creative: { object_type: "VIDEO" },
      },
      {
        id: "a2",
        name: "Het team",
        adset_id: "s1",
        campaign_id: "c1",
        effective_status: "ACTIVE",
        created_time: "2026-11-20T10:01:00+0100",
        creative: { object_type: "PHOTO" },
      },
    ],
  },
  [`${ACT}/insights`]: {
    data: days.flatMap((d) => [
      {
        ad_id: "a1",
        campaign_id: "c1",
        date_start: d,
        spend: "7.5",
        impressions: "900",
        reach: "700",
        clicks: "20",
        inline_link_clicks: "12",
        actions: [{ action_type: "lead", value: "1" }],
      },
      { ad_id: "a2", campaign_id: "c1", date_start: d, spend: "12", impressions: "800", reach: "650", clicks: "9", inline_link_clicks: "4" },
    ]),
  },
};

beforeAll(async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const u = new URL(String(input));
      const path = u.pathname.replace(/^\/v\d+\.\d+\//, "");
      expect(u.searchParams.get("access_token")).toBe("test-sleutel-van-de-systeemgebruiker");
      const body = META[path];
      return new Response(JSON.stringify(body ?? { error: { message: `onbekend: ${path}`, code: 100 } }), { status: body ? 200 : 400 });
    }),
  );
  process.env.META_SYSTEM_TOKEN = "test-sleutel-van-de-systeemgebruiker";
  ACC = must(await serviceDb().from("ad_accounts").select("id").eq("organization_id", ORG).order("sort").limit(1).single()).id;
  await serviceDb().from("ad_accounts").update({ meta_ad_account_id: ACT }).eq("id", ACC);
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.META_SYSTEM_TOKEN;
});

describe("Meta-sync", () => {
  it("haalt campagnes, ad sets, advertenties en dagcijfers op, en twee keer geeft geen dubbels", async () => {
    const first = await syncMetaAccount(ORG, ACC, 7);
    expect(first).toMatchObject({ campaigns: 1, adSets: 1, ads: 2, days: 7, rows: 12 });
    await syncMetaAccount(ORG, ACC, 7);

    const db = serviceDb();
    const campaigns = must(await db.from("campaigns").select().eq("organization_id", ORG).eq("meta_id", "c1"));
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]).toMatchObject({ outside_adsweet: true, goal: "aanvragen", status: "actief", daily_budget: 15, budget_level: "campagne" });

    const sets = must(await db.from("ad_sets").select().eq("campaign_id", campaigns[0].id));
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ meta_id: "s1", locked: true, status: "actief" });

    const ads = must(await db.from("ads").select().eq("campaign_id", campaigns[0].id).order("code"));
    expect(ads.map((a) => [a.code, a.meta_id, a.kind])).toEqual([
      ["A1", "a1", "video"],
      ["A2", "a2", "foto"],
    ]);

    const rows = must(await db.from("insights_daily").select().eq("campaign_id", campaigns[0].id));
    expect(rows).toHaveLength(12);
    const a1 = rows.filter((r) => r.ad_id === ads[0].id);
    expect(a1.reduce((s, r) => s + Number(r.spend), 0)).toBe(45);
    expect(a1.reduce((s, r) => s + Number(r.leads), 0)).toBe(6);
  });

  it("labelt volgens het playbook: geen aanvraag voor drie keer het doel is een verliezer", async () => {
    const db = serviceDb();
    const c = must(await db.from("campaigns").select().eq("organization_id", ORG).eq("meta_id", "c1").single());
    const ads = must(await db.from("ads").select().eq("campaign_id", c.id).order("code"));
    // Sarah: €72 uit voor 0 aanvragen bij een doel van [doel]; de video haalt 6 aanvragen aan €7,50.
    expect(ads[0].label).not.toBe("verliezer");
    expect(["verliezer", "geen", "vroeg"]).toContain(ads[1].label);
  });

  it("zet het advertentieaccount op betaalprobleem als Meta niet kan afschrijven", async () => {
    META[ACT] = { ...(META[ACT] as object), account_status: 3 };
    await syncMetaAccount(ORG, ACC, 7);
    const acc = must(await serviceDb().from("ad_accounts").select().eq("id", ACC).single());
    expect(acc).toMatchObject({ status: "betaalprobleem", payment_method_ok: false });
  });
});
