"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { must } from "@adsweet/db";
import { isDemo } from "@/lib/env";
import { PERIOD_COOKIE, PERIODS, type Period } from "@/lib/period";
import { DEMO_SESSION_COOKIE, getDb, serviceDb } from "@/lib/server/auth";
import { ACCOUNT_COOKIE, ORG_COOKIE } from "@/lib/server/context";
import { resetDemoDatabase, signDemoToken } from "@/lib/server/demo";
import { DEMO_LABELS_COOKIE, DEMO_PLAN_COOKIE, DEMO_STATE_COOKIE, DEMO_STATES, demoPanelEnabled, type DemoState } from "@/lib/server/demo-state";

const YEAR = 60 * 60 * 24 * 365;
const opts = { path: "/", sameSite: "lax" as const, httpOnly: true, maxAge: YEAR };

/** Kies een advertentieaccount ("" = alle accounts). */
export async function selectAccount(id: string) {
  const store = await cookies();
  if (id) store.set(ACCOUNT_COOKIE, id, opts);
  else store.delete(ACCOUNT_COOKIE);
  revalidatePath("/", "layout");
}

/** Werk in een andere organisatie (Agency: een klant of het bureau). RLS bepaalt of dat mag. */
export async function selectOrg(id: string): Promise<boolean> {
  const db = await getDb();
  const org = must(await db.from("organizations").select("id").eq("id", id).maybeSingle());
  if (!org) return false;
  const store = await cookies();
  store.set(ORG_COOKIE, id, opts);
  store.delete(ACCOUNT_COOKIE);
  revalidatePath("/", "layout");
  return true;
}

export async function setPeriod(p: Period) {
  if (!PERIODS.includes(p)) return;
  (await cookies()).set(PERIOD_COOKIE, p, opts);
  revalidatePath("/", "layout");
}

// ---------- Demopaneel (hoort niet bij het product) ----------

function guard() {
  if (!demoPanelEnabled()) throw new Error("Het demopaneel staat uit.");
}

const SCENARIO_MAIL: Record<string, string> = {
  lisa: "lisa@ateliernoor.voorbeeld",
  tom: "tom@peetersdakwerken.voorbeeld",
  sarah: "sarah@salonmila.voorbeeld",
  bram: "bram@veldenvuur.voorbeeld",
  eva: "eva@bureaukompas.voorbeeld",
};

/** Wissel van scenario: log in als die voorbeeldgebruiker. Alleen in de demomodus. */
export async function demoScenario(key: string) {
  guard();
  if (!isDemo) return;
  const email = SCENARIO_MAIL[key];
  if (!email) return;
  const profile = must(await serviceDb().from("profiles").select("user_id").eq("email", email).maybeSingle());
  if (!profile) return;
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, signDemoToken({ uid: profile.user_id, kind: "sessie", exp: Date.now() + 30 * 86_400_000 }), opts);
  for (const c of [ORG_COOKIE, ACCOUNT_COOKIE, DEMO_PLAN_COOKIE]) store.delete(c);
  revalidatePath("/", "layout");
}

export async function demoPlan(plan: string) {
  guard();
  (await cookies()).set(DEMO_PLAN_COOKIE, plan, opts);
  revalidatePath("/", "layout");
}

export async function demoState(state: string) {
  guard();
  if (!DEMO_STATES.includes(state as DemoState)) return;
  (await cookies()).set(DEMO_STATE_COOKIE, state, opts);
  revalidatePath("/", "layout");
}

export async function demoLabels(on: boolean) {
  guard();
  (await cookies()).set(DEMO_LABELS_COOKIE, on ? "1" : "0", opts);
  revalidatePath("/", "layout");
}

/** Begin opnieuw met de voorbeelddata (alleen de demodatabase). */
export async function demoReset() {
  guard();
  if (isDemo) await resetDemoDatabase();
  revalidatePath("/", "layout");
}
