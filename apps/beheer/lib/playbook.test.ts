import { describe, expect, it } from "vitest";
import { BASE_RULES, diffRules, fromForm, nextVersion, rulesOf, toForm, versionOrder } from "./playbook";

describe("playbook in Beheer", () => {
  it("zet de regels om naar het formulier en terug", () => {
    const form = toForm(BASE_RULES);
    expect(form["minDailyBudget.webshop"]).toBe("30");
    expect(form["scaleStep"]).toBe("20");
    expect(form["statusWarnRatio"]).toBe("75");
    const back = fromForm(form);
    expect(back.ok && back.rules).toEqual(BASE_RULES);
  });

  it("aanvaardt een komma en bewaart percentages als fractie", () => {
    const res = fromForm({ ...toForm(BASE_RULES), scaleStep: "12,5", "minDailyBudget.default": "€12,50" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rules.scaleStep).toBe(0.125);
      expect(res.rules.minDailyBudget.default).toBe(12.5);
    }
  });

  it("weigert waarden buiten de grenzen en een startstructuur die niet klopt", () => {
    const res = fromForm({ ...toForm(BASE_RULES), loserMultiple: "0", "startStructure.photos": "4" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.map((e) => e.key)).toEqual(["loserMultiple"]);
    const mix = fromForm({ ...toForm(BASE_RULES), "startStructure.photos": "4" });
    expect(!mix.ok && mix.errors).toEqual([{ key: "startStructure.ads", kind: "mix" }]);
    const web = fromForm({ ...toForm(BASE_RULES), "minDailyBudget.webshop": "5" });
    expect(!web.ok && web.errors).toEqual([{ key: "minDailyBudget.webshop", kind: "webshop" }]);
  });

  it("vult ontbrekende regels aan met de standaard", () => {
    expect(rulesOf({ loserMultiple: 4 }).minDailyBudget).toEqual(BASE_RULES.minDailyBudget);
    expect(rulesOf({ loserMultiple: 4 }).loserMultiple).toBe(4);
  });

  it("kiest het volgende versienummer en sorteert versies", () => {
    expect(nextVersion(["1.0"])).toBe("1.1");
    expect(nextVersion(["1.0", "1.2", "1.10"])).toBe("1.11");
    expect(nextVersion([])).toBe("1.0");
    expect(["1.0", "1.10", "1.2"].sort(versionOrder)).toEqual(["1.10", "1.2", "1.0"]);
  });

  it("vergelijkt twee versies", () => {
    const b = rulesOf({ ...BASE_RULES, scaleStep: 0.25, funnelSplit: { top: 3, middle: 1, bottom: 1 } });
    expect(diffRules(BASE_RULES, b)).toEqual([
      { key: "scaleStep", from: 0.2, to: 0.25 },
      { key: "funnelSplit.top", from: 2, to: 3 },
      { key: "funnelSplit.middle", from: 2, to: 1 },
    ]);
  });
});
