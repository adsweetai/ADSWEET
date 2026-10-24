import type { Plan } from "@adsweet/db";
import { PLAN_ORDER, TRIAL_DAYS } from "@adsweet/playbook";

// Plannen en rechten (docs/regels.md). De server gate't hiermee; de UI volgt. Prijzen en limieten staan in
// @adsweet/playbook, zodat Beheer dezelfde gebruikt.

export { PLAN_LIMITS, PLAN_ORDER, TRIAL_CREDITS, TRIAL_DAYS } from "@adsweet/playbook";

export const PLAN_NAME: Record<Plan, string> = { starter: "Starter", pro: "Pro", scale: "Scale", agency: "Agency" };

export const hasPlan = (plan: Plan, min: Plan) => PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);

/** AI (Studio, Dot, Concurrenten, AI-teksten): vanaf Pro. Starter heeft geen AI. */
export const hasAI = (plan: Plan) => hasPlan(plan, "pro");

/** Dag in de proefperiode (dag 1 = startdag) en de dagen die overblijven. */
export function trialDays(startedAt: string, today: string) {
  const day = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${startedAt}T12:00:00Z`)) / 86_400_000) + 1;
  return { day, left: Math.max(0, TRIAL_DAYS - day) };
}

/** Vanaf dag 27 staat de proefperiodebalk in Let op. */
export const TRIAL_WARN_FROM_DAY = 27;
