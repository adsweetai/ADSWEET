export const PLAYBOOK = {
  minDailyBudget: { default: 10, webshop: 30 },
  loserMultiple: 3,
  startStructure: { campaigns: 1, adSets: 1, ads: 5, photos: 3, videos: 2 },
  scaleStep: 0.2, // [schaalstappen PJ]
  newAdSetEveryWeeks: 2, // [x weken, PJ]
  funnelSplit: { top: 2, middle: 2, bottom: 1 }, // [standaardverdeling PJ]
} as const;

export const maxCostPerSale = (aov: number, margin: number) => aov * margin;
export const breakEvenRoas = (margin: number) => (margin > 0 ? 1 / margin : Infinity);
export const roas = (revenue: number, spend: number) => (spend > 0 ? revenue / spend : 0);
export const costPer = (spend: number, results: number) => (results > 0 ? spend / results : null);
export const leadMax = (clv: number, margin: number, closeRate: number) => clv * margin * closeRate;

export type Label = "winnaar" | "geen" | "verliezer" | "vroeg" | "rapport";
export function labelAd(
  a: { spend: number; results: number; revenue?: number },
  goal: { kind: "sales"; aov: number; margin: number } | { kind: "leads"; target: number } | { kind: "none" },
  minSpendToJudge = 15,
): Label {
  if (goal.kind === "none") return "rapport";
  const target = goal.kind === "sales" ? maxCostPerSale(goal.aov, goal.margin) : goal.target;
  if (a.results === 0 && a.spend >= PLAYBOOK.loserMultiple * target) return "verliezer";
  if (a.spend < minSpendToJudge) return "vroeg";
  if (goal.kind === "sales")
    return roas(a.revenue ?? 0, a.spend) >= breakEvenRoas(goal.margin) ? "winnaar" : "geen";
  const c = costPer(a.spend, a.results);
  return c !== null && c <= target ? "winnaar" : "geen";
}
