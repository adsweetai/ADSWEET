import type { Plan } from "@adsweet/db";

// Plannen en rechten (docs/regels.md). De server gate't hiermee; de UI volgt.

export const PLAN_ORDER: Plan[] = ["starter", "pro", "scale", "agency"];
export const PLAN_NAME: Record<Plan, string> = { starter: "Starter", pro: "Pro", scale: "Scale", agency: "Agency" };

export const hasPlan = (plan: Plan, min: Plan) => PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);

/** AI (Studio, Dot, Concurrenten, AI-teksten): vanaf Pro. Starter heeft geen AI. */
export const hasAI = (plan: Plan) => hasPlan(plan, "pro");

export const PLAN_LIMITS: Record<Plan, { price: number; accounts: number; credits: number; users: number | null }> = {
  starter: { price: 99, accounts: 1, credits: 0, users: 1 },
  pro: { price: 195, accounts: 1, credits: 300, users: 2 },
  scale: { price: 299, accounts: 3, credits: 600, users: 5 },
  agency: { price: 499, accounts: 5, credits: 1500, users: null },
};

/** Tijdens de proefperiode: hoogstens 50 AI-credits. */
export const TRIAL_CREDITS = 50;
export const TRIAL_DAYS = 30;

/** Dag in de proefperiode (dag 1 = startdag) en de dagen die overblijven. */
export function trialDays(startedAt: string, today: string) {
  const day = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${startedAt}T12:00:00Z`)) / 86_400_000) + 1;
  return { day, left: Math.max(0, TRIAL_DAYS - day) };
}

/** Vanaf dag 27 staat de proefperiodebalk in Let op. */
export const TRIAL_WARN_FROM_DAY = 27;
