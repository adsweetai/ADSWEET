import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { must } from "@adsweet/db";
import { formatLongDate } from "@adsweet/ui";
import { today } from "@/lib/clock";
import { env } from "@/lib/env";
import { slug } from "@/lib/naming";
import { serviceDb } from "./auth";
import { ownerOf, sendMail } from "./mail";
import type { AppContext } from "./context";

// Doorverwijzen (App.dc.html#doorverwijzen): een persoonlijke link adsweet.ai/r/[code]. Wie zich daarmee
// aanmeldt, komt in je lijst. Jullie krijgen allebei een maand gratis zodra de nieuwe klant betaalt.

export const REF_COOKIE = "as-ref";
const CODE = /^[a-z0-9-]{4,40}$/;

export interface ReferralVM {
  link: string;
  url: string;
  rows: { id: string; name: string; signedUp: string | null; freeFrom: string | null }[];
}

/** De code van de organisatie; de eerste keer maken we ze aan. */
async function ensureCode(ctx: AppContext): Promise<string> {
  if (ctx.org.referral_code) return ctx.org.referral_code;
  const svc = serviceDb();
  const base = slug(((ctx.org.naming ?? {}) as { short?: string }).short ?? ctx.org.name).slice(0, 16) || "adsweet";
  for (let i = 0; i < 5; i++) {
    const code = `${base}-${randomBytes(2).toString("hex")}`;
    const taken = must(await svc.from("organizations").select("id").eq("referral_code", code).maybeSingle());
    if (taken) continue;
    await svc.from("organizations").update({ referral_code: code }).eq("id", ctx.org.id);
    return code;
  }
  throw new Error("Geen vrije doorverwijscode gevonden.");
}

export async function loadReferral(ctx: AppContext): Promise<ReferralVM> {
  const code = await ensureCode(ctx);
  const rows = must(await serviceDb().from("referrals").select().eq("organization_id", ctx.org.id).order("signed_up_at", { ascending: false }));
  const url = `${env.siteUrl}/r/${code}`;
  return {
    link: url.replace(/^https?:\/\//, ""),
    url,
    rows: rows.map((r) => ({
      id: r.id,
      name: r.referred_name ?? "",
      signedUp: r.signed_up_at ? formatLongDate(r.signed_up_at, true) : null,
      freeFrom: r.free_month_from ? formatLongDate(r.free_month_from, true) : null,
    })),
  };
}

/** De doorverwijzer van een code, of null. */
export async function referrerOf(code: string): Promise<string | null> {
  const c = code.toLowerCase();
  if (!CODE.test(c)) return null;
  return must(await serviceDb().from("organizations").select("id").eq("referral_code", c).maybeSingle())?.id ?? null;
}

/** Bij een nieuwe organisatie: kwam die via een doorverwijslink, dan komt ze in de lijst van de doorverwijzer. */
export async function recordReferral(newOrgId: string, name: string) {
  let code: string | undefined;
  try {
    code = (await cookies()).get(REF_COOKIE)?.value;
  } catch {
    return;
  }
  if (!code) return;
  const referrer = await referrerOf(code);
  if (!referrer || referrer === newOrgId) return;
  await serviceDb()
    .from("referrals")
    .insert({ organization_id: referrer, code: code.toLowerCase(), referred_name: name, signed_up_at: today(), referred_organization_id: newOrgId });
  // Mails.dc.html: Doorverwijzing gelukt. De gratis maand gaat in zodra de nieuwe klant betaalt (fase 13).
  const owner = await ownerOf(referrer);
  if (owner) await sendMail("doorverwijzing", owner.email, { name, date: "[datum]" });
  try {
    (await cookies()).delete(REF_COOKIE);
  } catch {
    // Tijdens het tonen van een pagina kan de cookie niet weg; ze verloopt vanzelf.
  }
}
