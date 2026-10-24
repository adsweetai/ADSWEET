import { describe, it, expect } from "vitest";
import { maxCostPerSale, breakEvenRoas, roas, costPer, labelAd } from "./rules";
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
