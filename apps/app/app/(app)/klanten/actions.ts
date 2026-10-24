"use server";

import { revalidatePath } from "next/cache";
import type { OrgKind } from "@adsweet/db";
import { createClient, setClientAccess, type Access } from "@/lib/server/agency";

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
