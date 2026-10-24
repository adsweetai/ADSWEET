"use server";

import { revalidatePath } from "next/cache";
import { addCompetitor } from "@/lib/server/competitors";
import { generateStudio, saveStudioImage, type StudioKind } from "@/lib/server/studio";

// Studio en Concurrenten (vanaf Pro). De gate en de credits worden in lib/server gecontroleerd.

export async function studioAction(kind: StudioKind) {
  const res = await generateStudio(kind);
  revalidatePath("/", "layout");
  return res;
}

export async function saveImageAction(description: string) {
  await saveStudioImage(description);
  revalidatePath("/advertenties");
}

export async function competitorAction(name: string) {
  const res = await addCompetitor(name);
  revalidatePath("/concurrenten");
  return res;
}
