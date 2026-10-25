"use server";

import { revalidatePath } from "next/cache";
import type { OrgKind } from "@adsweet/db";
import { createClient, setClientAccess, type Access } from "@/lib/server/agency";
import { importChoices, importClients, syncClient } from "@/lib/server/meta/import";

export async function addClientAction(input: { name: string; website: string; kind: OrgKind; owner: string | null; mode: "invite" | "self"; email: string }) {
  const res = await createClient(input);
  revalidatePath("/", "layout");
  return res;
}

export async function accessAction(userId: string, clientId: string, access: Access) {
  const res = await setClientAccess(userId, clientId, access);
  revalidatePath("/team");
  return res;
}

/** Klanten uit Meta: de advertentieaccounts die de sleutel ziet. */
export async function importChoicesAction() {
  try {
    return { ok: true as const, ...(await importChoices()) };
  } catch {
    return { ok: false as const };
  }
}

export async function importClientsAction(accountIds: string[]) {
  const res = await importClients(accountIds);
  revalidatePath("/", "layout");
  return res;
}

/** Per klant de cijfers ophalen, één verzoek per klant. */
export async function syncClientAction(clientId: string) {
  return syncClient(clientId);
}
