"use server";

import { revalidatePath } from "next/cache";
import { addRule, addTemplate, removeRule, setLimit, setMode, type Limit, type Mode, type TEMPLATES } from "@/lib/server/autopilot";

const done = () => revalidatePath("/autopilot");

export async function modeAction(mode: Mode) {
  await setMode(mode);
  done();
}

export async function limitAction(key: Limit, on: boolean) {
  await setLimit(key, on);
  done();
}

export async function ruleAction(input: { metric: string; comparator: string; value: string; window: string; action: string }) {
  const res = await addRule(input);
  done();
  return res;
}

export async function templateAction(key: (typeof TEMPLATES)[number]) {
  await addTemplate(key);
  done();
}

export async function removeRuleAction(id: string) {
  await removeRule(id);
  done();
}
