"use server";

import type { Plan, SubscriptionStatus } from "@adsweet/db";
import { cancelSubscription, changePlan, demoSubscriptionState, resumeSubscription, saveBilling, scheduleBillingPeriod } from "@/lib/server/subscription";

export async function changePlanAction(plan: Plan) {
  return changePlan(plan);
}

export async function billingPeriodAction(action: "yearly" | "monthly" | "undo") {
  await scheduleBillingPeriod(action);
}

export async function saveBillingAction(input: { name: string; vat: string; address: string; email: string }) {
  return saveBilling(input);
}

export async function cancelAction(reason: string | null) {
  return cancelSubscription(reason);
}

export async function resumeAction() {
  await resumeSubscription();
}

export async function demoSubStateAction(state: SubscriptionStatus) {
  await demoSubscriptionState(state);
}
