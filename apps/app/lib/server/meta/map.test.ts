import { describe, expect, it } from "vitest";
import { accountStatus, adStatus, campaignGoal, campaignStatus, fromMinor, insightNumbers, metaDate, pixelOk } from "./map";

describe("Meta naar AdSweet", () => {
  it("leest de cijfers van een dag", () => {
    const n = insightNumbers({
      ad_id: "1",
      date_start: "2026-12-06",
      spend: "11.714",
      impressions: "5230",
      reach: "4100",
      clicks: "140",
      inline_link_clicks: "73",
      actions: [
        { action_type: "purchase", value: "2" },
        { action_type: "offsite_conversion.fb_pixel_purchase", value: "2" },
        { action_type: "landing_page_view", value: "51" },
        { action_type: "add_to_cart", value: "6" },
        { action_type: "video_view", value: "900" },
      ],
      action_values: [{ action_type: "purchase", value: "116.00" }],
    });
    expect(n).toMatchObject({
      date: "2026-12-06",
      spend: 11.71,
      impressions: 5230,
      link_clicks: 73,
      purchases: 2,
      revenue: 116,
      leads: 0,
      lpv: 51,
      add_to_cart: 6,
      video_3s: 900,
    });
    expect(n.view_content).toBeNull();
  });

  it("telt aanvragen als lead en laat niet gemeten leeg", () => {
    const n = insightNumbers({ date_start: "2026-12-06", spend: "21", actions: [{ action_type: "lead", value: "1" }] });
    expect(n).toMatchObject({ leads: 1, purchases: 0, revenue: null, impressions: null });
  });

  it("vertaalt statussen en doelen", () => {
    expect(campaignStatus("ACTIVE")).toBe("actief");
    expect(campaignStatus("CAMPAIGN_PAUSED")).toBe("gepauzeerd");
    expect(campaignStatus("ARCHIVED")).toBe("afgelopen");
    expect(adStatus("ADSET_PAUSED")).toBe("uit");
    expect(adStatus("DISAPPROVED")).toBe("afgekeurd");
    expect(adStatus("PENDING_REVIEW")).toBe("in_review");
    expect(campaignGoal("OUTCOME_SALES")).toBe("verkopen");
    expect(campaignGoal("OUTCOME_LEADS")).toBe("aanvragen");
    expect(campaignGoal("OUTCOME_AWARENESS")).toBe("bereik");
    expect(accountStatus(1)).toBe("actief");
    expect(accountStatus(3)).toBe("betaalprobleem");
    expect(accountStatus(2)).toBe("uitgeschakeld");
  });

  it("rekent centen en datums om", () => {
    expect(fromMinor("4000")).toBe(40);
    expect(fromMinor(undefined)).toBeNull();
    expect(metaDate("2026-11-16T09:12:00+0100")).toBe("2026-11-16");
    expect(pixelOk("2026-12-06T20:00:00+0100", "2026-12-07")).toBe(true);
    expect(pixelOk("2026-11-01T20:00:00+0100", "2026-12-07")).toBe(false);
    expect(pixelOk(null, "2026-12-07")).toBe(false);
  });
});
