// Plannen en prijzen (docs/regels.md). Gedeeld door de app en Beheer.

export type PlanId = "starter" | "pro" | "scale" | "agency";

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "scale", "agency"];

/** Prijs per maand excl. btw, advertentieaccounts, AI-credits per maand en gebruikers (null = onbeperkt). Agency: vanaf. */
export const PLAN_LIMITS: Record<PlanId, { price: number; accounts: number; credits: number; users: number | null }> = {
  starter: { price: 99, accounts: 1, credits: 0, users: 1 },
  pro: { price: 195, accounts: 1, credits: 300, users: 2 },
  scale: { price: 299, accounts: 3, credits: 600, users: 5 },
  agency: { price: 499, accounts: 5, credits: 1500, users: null },
};

/** Founding members: 30% korting zolang ze klant blijven, voor de eerste 50. */
export const FOUNDING_OFF = 0.3;
export const FOUNDING_MAX = 50;

/** Tijdens de proefperiode: hoogstens 50 AI-credits. */
export const TRIAL_CREDITS = 50;
export const TRIAL_DAYS = 30;

/** De prijs per maand, met de founding-korting. */
export const planPrice = (plan: PlanId, founding: boolean) => Math.round(PLAN_LIMITS[plan].price * (founding ? 1 - FOUNDING_OFF : 1) * 100) / 100;
