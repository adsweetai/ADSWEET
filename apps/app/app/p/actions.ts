"use server";

import { savePreviewFeedback } from "@/lib/server/campaign-changes";

/** Feedback op de openbare preview-pagina. Werkt zonder account: de code in de link is de sleutel. */
export async function previewFeedbackAction(code: string, adId: string, status: "goedgekeurd" | "opmerking" | null, note: string) {
  return savePreviewFeedback(code, adId, status, note);
}
