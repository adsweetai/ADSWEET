import { describe, expect, it } from "vitest";
import type { Campaign, Goal } from "@adsweet/db";
import { goalKind, goalTypeForKind, mainCampaign } from "./metrics";

const camp = (id: string, goal: Campaign["goal"], kind: Campaign["kind"] = "vast") => ({ id, goal, kind }) as Campaign;
const goal = (type: Goal["type"]) => ({ type }) as Goal;

describe("Welke campagne het dashboard volgt", () => {
  it("bij een doel verkopen eerst een campagne voor verkopen, ook als er een campagne voor volgers loopt", () => {
    const live = [camp("volgers", "volgers"), camp("winkel", "verkopen")];
    expect(mainCampaign(live, goal("verkopen"))?.id).toBe("winkel");
    expect(goalKind(goal("verkopen"), mainCampaign(live, goal("verkopen")))).toBe("sales");
    // Zonder doel: zoals vroeger de eerste vaste campagne.
    expect(mainCampaign(live, null)?.id).toBe("volgers");
    expect(mainCampaign([], goal("verkopen"))).toBeNull();
  });

  it("de soort zaak bepaalt het eerste doel", () => {
    expect(goalTypeForKind("webshop")).toBe("verkopen");
    expect(goalTypeForKind("dienstverlener")).toBe("aanvragen");
    expect(goalTypeForKind("lokaal")).toBe("zaak");
    expect(goalTypeForKind("zelfstandige")).toBeNull();
  });
});
