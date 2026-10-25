"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { must } from "@adsweet/db";
import { isDemo } from "@/lib/env";
import { createDemoUser, sendInviteLink, serviceDb, startDemoSession } from "@/lib/server/auth";
import { loadInvitation } from "@/lib/server/invitations";
import { createOwnOrganization } from "@/lib/server/onboarding";

type Outcome = "ok" | "ok_bestaand" | "perm" | "noacc" | "expired";

/**
 * Demo: wat Meta teruggeeft na "Doorgaan met Facebook". Account maken opent Vandaag als nieuwe klant (de
 * voornaam komt uit Facebook: in de demo Sarah). Inloggen opent de app als Lisa.
 */
export async function demoFacebookAction(context: "signup" | "login", outcome: Outcome) {
  if (!isDemo) redirect("/inloggen");
  if (outcome !== "ok" && outcome !== "ok_bestaand") redirect(`/${context === "signup" ? "account-maken" : "inloggen"}?fout=${outcome}`);
  if (context === "signup") {
    const uid = await createDemoUser(`nieuw-${randomBytes(3).toString("hex")}@nieuw.voorbeeld`, "Sarah", "facebook");
    await startDemoSession(uid);
    await createOwnOrganization(uid);
    redirect("/vandaag");
  }
  const lisa = must(await serviceDb().from("profiles").select("user_id").eq("email", "lisa@ateliernoor.voorbeeld").single());
  await startDemoSession(lisa.user_id);
  redirect("/vandaag");
}

export interface WaitlistState {
  ok?: boolean;
  error?: boolean;
}

/** Testfase: zet je op de wachtlijst. */
export async function waitlistAction(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const name = String(form.get("name") ?? "")
    .trim()
    .slice(0, 120);
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  const website = String(form.get("website") ?? "")
    .trim()
    .slice(0, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: true };
  await serviceDb()
    .from("waitlist")
    .insert({ name, email, website: website || null });
  return { ok: true };
}

/** Uitnodiging: een link per mail naar het uitgenodigde adres. */
export async function inviteMailAction(token: string) {
  const inv = await loadInvitation(token);
  if (!inv?.valid) redirect(`/uitnodiging/${encodeURIComponent(token)}`);
  await sendInviteLink(inv.email, `/uitnodiging/${token}/aanvaarden`);
  redirect("/mail-verstuurd");
}

/** Demo: uitnodiging aanvaarden met "Doorgaan met Facebook". */
export async function inviteFacebookAction(token: string, outcome: Outcome) {
  const inv = await loadInvitation(token);
  if (!isDemo || !inv?.valid) redirect(`/uitnodiging/${encodeURIComponent(token)}`);
  if (outcome !== "ok" && outcome !== "ok_bestaand") redirect(`/uitnodiging/${encodeURIComponent(token)}?fout=${outcome}`);
  const first = inv.email.split("@")[0].split(/[._-]/)[0];
  const uid = await createDemoUser(inv.email, first.slice(0, 1).toUpperCase() + first.slice(1), "facebook");
  await startDemoSession(uid);
  redirect(`/uitnodiging/${encodeURIComponent(token)}/aanvaarden`);
}
