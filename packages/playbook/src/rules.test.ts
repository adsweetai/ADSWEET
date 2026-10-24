import { describe, it, expect } from "vitest";
import { maxCostPerSale, breakEvenRoas, roas, costPer, labelAd, leadMax, loserLimit, salesStatus, leadsStatus } from "./rules";
describe("Lisa", () => {
  it("max kost per verkoop", () => expect(maxCostPerSale(58, 0.4)).toBeCloseTo(23.2));
  it("break-even", () => expect(breakEvenRoas(0.4)).toBeCloseTo(2.5));
  it("ROAS", () => expect(roas(638, 280)).toBeCloseTo(2.28, 2));
  it("kost per verkoop", () => expect(costPer(280, 11)).toBeCloseTo(25.45, 2));
  it("A4 is verliezer", () => expect(labelAd({ spend: 72, results: 0 }, { kind: "sales", aov: 58, margin: 0.4 })).toBe("verliezer"));
  it("A1 is winnaar", () => expect(labelAd({ spend: 82, results: 5, revenue: 290 }, { kind: "sales", aov: 58, margin: 0.4 })).toBe("winnaar"));
});
describe("Tom", () => {
  it("B3 is verliezer", () => expect(labelAd({ spend: 60, results: 0 }, { kind: "leads", target: 20 })).toBe("verliezer"));
  it("B1 is winnaar", () => expect(labelAd({ spend: 64, results: 5 }, { kind: "leads", target: 20 })).toBe("winnaar"));
});

describe("Lisa · meer", () => {
  it("verliezersgrens 3 × €23,20 = €69,60", () => expect(loserLimit(maxCostPerSale(58, 0.4))).toBeCloseTo(69.6));
  it("zonder A4: €208 voor €638, ROAS 3,07", () => expect(roas(638, 208)).toBeCloseTo(3.07, 2));
  it("video's ROAS 3,41, foto's 0,91", () => {
    expect(roas(522, 153)).toBeCloseTo(3.41, 2);
    expect(roas(116, 127)).toBeCloseTo(0.91, 2);
  });
  it("A3 nog geen winnaar, A5 te vroeg", () => {
    expect(labelAd({ spend: 48, results: 2, revenue: 116 }, { kind: "sales", aov: 58, margin: 0.4 })).toBe("geen");
    expect(labelAd({ spend: 7, results: 0 }, { kind: "sales", aov: 58, margin: 0.4 })).toBe("vroeg");
  });
  it("EuroTegel: 2,28 tegenover 2,5 is Let op", () => expect(salesStatus(2.28, 2.5)).toBe("warn"));
});

describe("Tom · meer", () => {
  it("doel per aanvraag: €2.000 × 25% × 4% = €20", () => expect(leadMax(2000, 0.25, 0.04)).toBeCloseTo(20));
  it("kost per aanvraag €210 / 9 = €23,33", () => expect(costPer(210, 9)).toBeCloseTo(23.33, 2));
  it("laatste 7 dagen €21,00 tegenover €20 is Let op", () => expect(leadsStatus(costPer(105, 5), 20)).toBe("warn"));
  it("B4 nog geen winnaar, B5 te vroeg", () => {
    expect(labelAd({ spend: 30, results: 1 }, { kind: "leads", target: 20 })).toBe("geen");
    expect(labelAd({ spend: 8, results: 0 }, { kind: "leads", target: 20 })).toBe("vroeg");
  });
});

describe("Sarah en Bram", () => {
  it("Sarah: €360 × 50% × 1 op 4 = €45", () => expect(leadMax(360, 0.5, 0.25)).toBeCloseTo(45));
  it("Bram: break-evens en status per account", () => {
    expect(breakEvenRoas(0.35)).toBeCloseTo(2.86, 2);
    expect(breakEvenRoas(0.45)).toBeCloseTo(2.22, 2);
    expect(salesStatus(roas(1512, 420), breakEvenRoas(0.35))).toBe("ok");
    expect(salesStatus(roas(549, 280), breakEvenRoas(0.45))).toBe("warn");
    expect(salesStatus(roas(90, 140), breakEvenRoas(0.5))).toBe("act");
    expect(roas(2151, 840)).toBeCloseTo(2.56, 2);
  });
});
