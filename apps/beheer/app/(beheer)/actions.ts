"use server";

import { revalidatePath } from "next/cache";
import { fromForm, type FormError } from "@/lib/playbook";
import { approvePartner, callDone, createCode, planCall, publishConcept, restoreVersion, saveConcept } from "@/lib/server/data";

// Elke actie controleert op de server of je adsweet_admin bent (in lib/server/data.ts).

export async function saveConceptAction(
  form: Record<string, string>,
  note: string,
): Promise<{ ok: true; version: string } | { ok: false; errors: FormError[] }> {
  const res = fromForm(form);
  if (!res.ok) return res;
  const version = await saveConcept(res.rules, note);
  revalidatePath("/", "layout");
  return { ok: true, version };
}

export async function publishAction() {
  const version = await publishConcept();
  revalidatePath("/", "layout");
  return version;
}

export async function restoreAction(version: string) {
  const concept = await restoreVersion(version);
  revalidatePath("/", "layout");
  return concept;
}

export async function createCodeAction(input: { code: string; kind: "founding" | "doorverwijzing" | "partner"; percent: string; months: string; max: string }) {
  const n = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : null);
  const res = await createCode({ code: input.code, kind: input.kind, percent: n(input.percent), months: n(input.months), max: n(input.max) });
  revalidatePath("/kortingscodes");
  return res;
}

export async function approvePartnerAction(id: string) {
  await approvePartner(id);
  revalidatePath("/partners");
}

export async function planCallAction(id: string, startsAt: string) {
  const ok = await planCall(id, startsAt);
  revalidatePath("/calls");
  return ok;
}

export async function callDoneAction(id: string) {
  await callDone(id);
  revalidatePath("/calls");
}
