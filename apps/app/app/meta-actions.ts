"use server";

import { connectMeta, metaChoices, metaPixels, syncNow } from "@/lib/server/meta/connect";
import { MetaError } from "@/lib/server/meta/graph";

// De koppeling met Meta vanuit de onboarding en Instellingen. De sleutel blijft op de server.

export async function metaChoicesAction() {
  try {
    return { ok: true as const, ...(await metaChoices()) };
  } catch (e) {
    return { ok: false as const, error: e instanceof MetaError && e.expired ? ("expired" as const) : ("meta" as const) };
  }
}

export async function metaPixelsAction(accountId: string) {
  try {
    return await metaPixels(accountId);
  } catch {
    return [];
  }
}

export async function metaConnectAction(sel: { accountId: string; pageId: string | null; pixelId: string | null }) {
  return connectMeta(sel);
}

export async function metaSyncAction() {
  return syncNow();
}
