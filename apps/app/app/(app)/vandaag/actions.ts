"use server";

import { revalidatePath } from "next/cache";
import { applyRecommendation, decideRecommendation, reopenRecommendation, undoLogEntry } from "@/lib/server/changes";

export async function applyCard(id: string) {
  const res = await applyRecommendation(id);
  revalidatePath("/", "layout");
  return res;
}

export async function decideCard(id: string, decision: "later" | "zo-laten") {
  const res = await decideRecommendation(id, decision);
  revalidatePath("/", "layout");
  return res;
}

export async function reopenCard(id: string) {
  await reopenRecommendation(id);
  revalidatePath("/", "layout");
}

export async function undoChange(logId: string) {
  const res = await undoLogEntry(logId);
  revalidatePath("/", "layout");
  return res;
}
