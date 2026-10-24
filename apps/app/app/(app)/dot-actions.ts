"use server";

import { revalidatePath } from "next/cache";
import { applyDotChange, askDot, declineDotChange, dotHistory, logWizardFill, type Intent } from "@/lib/server/dot";
import { markTourSeen, resetTours, type TourName } from "@/lib/server/tours";

// Dot en de rondleidingen. Dot zit vanaf Pro: de gate staat in lib/server/dot.ts.

export async function dotAskAction(intent: Intent, text: string) {
  return askDot(intent, text);
}

export async function dotHistoryAction() {
  return dotHistory();
}

export async function dotApplyAction(change: { campaignId: string; value: number }) {
  const res = await applyDotChange(change);
  revalidatePath("/", "layout");
  return res;
}

export async function dotDeclineAction() {
  await declineDotChange();
}

export async function dotFillAction() {
  await logWizardFill();
  revalidatePath("/logboek");
}

export async function tourSeenAction(name: TourName) {
  await markTourSeen(name);
}

export async function toursResetAction() {
  await resetTours();
  revalidatePath("/", "layout");
}
