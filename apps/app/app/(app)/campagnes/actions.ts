"use server";

import { revalidatePath } from "next/cache";
import { setAdStatus } from "@/lib/server/changes";
import {
  bulkLaunch,
  createCampaign,
  duplicateAd,
  launchAd,
  setCampaignBudget,
  setCampaignPaused,
  startTestgrid,
  type NewAd,
  type WizardInput,
} from "@/lib/server/campaign-changes";

// Server actions voor campagnes en advertenties. De rechten en het plan worden in lib/server gecontroleerd.

const refresh = () => revalidatePath("/", "layout");

export async function pauseCampaignAction(id: string, paused: boolean) {
  const res = await setCampaignPaused(id, paused);
  refresh();
  return res;
}

export async function budgetAction(id: string, value: number, viaProposal: boolean) {
  const res = await setCampaignBudget(id, value, viaProposal);
  refresh();
  return res;
}

export async function createCampaignAction(input: WizardInput) {
  const res = await createCampaign(input);
  refresh();
  return res;
}

export async function launchAdAction(input: { campaignId: string; adSetId: string | null; confirmed: boolean; draft: boolean; ad: NewAd }) {
  const res = await launchAd(input);
  refresh();
  return res;
}

export async function bulkLaunchAction(input: { campaignId: string; ads: NewAd[] }) {
  const res = await bulkLaunch(input);
  refresh();
  return res;
}

export async function testgridAction(input: { campaignId: string; what: "koppen" | "beelden" | "regio" | "plaats"; variants: string[] }) {
  const res = await startTestgrid(input);
  refresh();
  return res;
}

export async function adStatusAction(id: string, value: "actief" | "uit") {
  const res = await setAdStatus(id, value);
  refresh();
  return res;
}

export async function duplicateAdAction(id: string) {
  const res = await duplicateAd(id);
  refresh();
  return res;
}
