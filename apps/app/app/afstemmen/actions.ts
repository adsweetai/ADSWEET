"use server";

import { revalidatePath } from "next/cache";
import type { Goal } from "@adsweet/db";
import { addSampleDocuments, completeTuningStep, removeDocument, saveBrand, saveOffer, saveTone, saveTuningGoal, tuningReadSite } from "@/lib/server/tuning";

// Server actions van het onboardingpaneel. Rechten en organisatie worden in lib/server/tuning.ts gecontroleerd.

const done = () => revalidatePath("/afstemmen", "layout");

export async function stepDoneAction(step: number, skip: boolean) {
  await completeTuningStep(step, skip);
  revalidatePath("/", "layout");
}

export async function tuningSiteAction(site: string) {
  const res = await tuningReadSite(site);
  done();
  return res;
}

export async function brandAction(input: { colors: string[]; font: string; neverSay: string }) {
  await saveBrand(input);
  done();
}

export async function removeDocAction(id: string) {
  await removeDocument(id);
  done();
}

export async function sampleDocsAction() {
  await addSampleDocuments();
  done();
}

export async function offerAction(input: { sells: string; audience: string; differentiator: string; bestsellers: string; moments: string[] }) {
  await saveOffer(input);
  done();
}

export async function toneAction(input: { tones: string[]; sayYes: string; sayNo: string }) {
  await saveTone(input);
  done();
}

export async function tuningGoalAction(input: { type: Goal["type"]; aov: string; margin: string; cpl: string }) {
  await saveTuningGoal(input);
  done();
}
