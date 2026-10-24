"use server";

import type { Naming } from "@/lib/naming";
import {
  disconnectMeta,
  reconnectMeta,
  requestDeletion,
  rereadWebsite,
  saveBusinessProfile,
  saveNaming,
  saveNumbers,
  savePayer,
  saveTimezone,
  setNotification,
  type ProfileVM,
} from "@/lib/server/settings";

export async function saveProfileAction(input: ProfileVM) {
  return saveBusinessProfile(input);
}

export async function rereadAction() {
  return rereadWebsite();
}

export async function saveNumbersAction(input: { aov: string; margin: string; roas: string; cpl: string; clv: string; lmargin: string; chance: string }) {
  return saveNumbers(input);
}

export async function saveNamingAction(input: Omit<Naming, "short">) {
  return saveNaming(input);
}

export async function savePayerAction(input: { payer: string; beneficiary: string }) {
  return savePayer(input);
}

export async function setNotificationAction(type: string, on: boolean) {
  await setNotification(type, on);
}

export async function saveTimezoneAction(tz: string) {
  await saveTimezone(tz);
}

export async function disconnectMetaAction() {
  await disconnectMeta();
}

export async function requestDeletionAction(on: boolean) {
  return requestDeletion(on);
}

export async function reconnectMetaAction() {
  return reconnectMeta();
}
