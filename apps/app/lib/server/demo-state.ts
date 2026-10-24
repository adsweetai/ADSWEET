import "server-only";
import { cookies } from "next/headers";
import type { Plan } from "@adsweet/db";
import { isDemo } from "@/lib/env";

// Het demopaneel (rechtsonder, "Demo"). Hoort niet bij het product: alleen in de demomodus, in ontwikkeling
// of met DEMO_PANEL=true. De keuzes staan in cookies en sturen de server (plan, staat, labels).

export const DEMO_PLAN_COOKIE = "as-demo-plan";
export const DEMO_STATE_COOKIE = "as-demo-staat";
export const DEMO_LABELS_COOKIE = "as-demo-labels";

export type DemoState = "normaal" | "proef" | "credits" | "betaal" | "koppeling" | "testfase";
export const DEMO_STATES: DemoState[] = ["normaal", "proef", "credits", "betaal", "koppeling", "testfase"];
const PLANS: Plan[] = ["starter", "pro", "scale", "agency"];

export const demoPanelEnabled = () => isDemo || process.env.NODE_ENV !== "production" || process.env.DEMO_PANEL === "true";

export interface DemoOverrides {
  enabled: boolean;
  plan: Plan | null;
  state: DemoState;
  labels: boolean;
}

export async function demoOverrides(): Promise<DemoOverrides> {
  if (!demoPanelEnabled()) return { enabled: false, plan: null, state: "normaal", labels: false };
  const c = await cookies();
  const plan = c.get(DEMO_PLAN_COOKIE)?.value as Plan | undefined;
  const state = c.get(DEMO_STATE_COOKIE)?.value as DemoState | undefined;
  return {
    enabled: true,
    plan: plan && PLANS.includes(plan) ? plan : null,
    state: state && DEMO_STATES.includes(state) ? state : "normaal",
    labels: c.get(DEMO_LABELS_COOKIE)?.value === "1",
  };
}
