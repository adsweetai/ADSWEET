"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FunnelPhase, Goal } from "@adsweet/db";
import {
  calcTexts,
  checkCode,
  connectMetaDemo,
  finishOnboarding,
  launchOnboardingCampaign,
  readAndSaveWebsite,
  removeMedia,
  saveFirstCampaign,
  saveGoal,
  saveManual,
  saveNumbers,
  savePayer,
  saveProfile,
  saveWelcome,
  setReached,
  startTrialDemo,
  type MetaOutcome,
} from "@/lib/server/onboarding";

// Server actions van de onboarding. Elke stap bewaart meteen; de controle op rol en organisatie zit in lib/server.

const done = () => revalidatePath("/onboarding", "layout");

export async function goStep(n: number) {
  await setReached(n);
  done();
}

export async function welcomeAction(name: string) {
  await saveWelcome(name);
  done();
}

export async function readSiteAction(site: string) {
  const res = await readAndSaveWebsite(site);
  done();
  return res;
}

export async function manualAction(input: { name: string; sells: string; prices: string; audience: string; region: string; style: string }) {
  await saveManual(input);
  done();
}

export async function profileAction(input: {
  name: string;
  sells: string;
  tone: string;
  contact: string;
  differentiator: string;
  bestCustomers: string;
  competitors: string;
}) {
  await saveProfile(input);
  done();
}

export async function removeMediaAction(id: string) {
  await removeMedia(id);
  done();
}

export async function goalAction(input: {
  type: Goal["type"];
  zaakMode: "aanvragen" | "bekendheid";
  area: "radius" | "prov" | "land";
  areaValue: string;
  radius: number;
  countries: string;
  languages: string;
  age: string;
  special: boolean;
}) {
  const res = await saveGoal(input);
  done();
  return res;
}

export async function numbersAction(input: { aov: string; margin: string; targetRoas: string; cpl: string; clv: string; lmargin: string; chance: string }) {
  const res = await saveNumbers(input);
  done();
  return res;
}

export async function calcAction(aov: number, margin: number, clv: number, lmargin: number, chance: number) {
  return calcTexts(aov, margin, clv, lmargin, chance);
}

export async function metaAction(outcome: MetaOutcome) {
  const res = await connectMetaDemo(outcome);
  done();
  return res;
}

export async function payerAction(payer: string, beneficiary: string) {
  await savePayer(payer, beneficiary);
  done();
}

export async function firstCampaignAction(input: {
  budget: number;
  accepted: boolean;
  slots: { phase: FunnelPhase; kind: "foto" | "video"; mediaId: string | null; text: string; headline: string; cta: string }[];
}) {
  const res = await saveFirstCampaign(input);
  done();
  return res;
}

export async function codeAction(code: string) {
  return checkCode(code);
}

export async function trialAction(input: {
  plan: "starter" | "pro" | "scale";
  period: "maandelijks" | "jaarlijks";
  code: string;
  billing: { name: string; vat: string; address: string; email: string };
}) {
  const res = await startTrialDemo(input);
  done();
  return res;
}

export async function liveAction() {
  const res = await launchOnboardingCampaign();
  done();
  return res;
}

export async function finishAction() {
  await finishOnboarding();
  revalidatePath("/", "layout");
  redirect("/vandaag");
}
