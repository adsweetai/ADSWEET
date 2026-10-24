"use server";

import { suggestPrimaryTexts } from "@/lib/server/copy";

export async function rewriteAction(round: number) {
  return suggestPrimaryTexts(round);
}
