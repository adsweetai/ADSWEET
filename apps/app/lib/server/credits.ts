import "server-only";
import { must } from "@adsweet/db";
import { PLAN_LIMITS, TRIAL_CREDITS, hasAI } from "@/lib/plans";
import { getDb, serviceDb } from "./auth";
import type { AppContext } from "./context";

// AI-credits: de som van het grootboek. In de proefperiode hoogstens 50, daarna het tegoed van het plan per maand.

export interface Credits {
  left: number;
  total: number;
  trial: boolean;
}

export async function creditsFor(ctx: AppContext): Promise<Credits | null> {
  if (!hasAI(ctx.plan) || ctx.inClient) return null;
  const db = await getDb();
  const trial = ctx.org.subscription_status === "proef" && !!ctx.org.trial_started_at;
  const ledger = must(await db.from("credits_ledger").select("delta").eq("organization_id", ctx.org.id));
  const total = trial ? TRIAL_CREDITS : PLAN_LIMITS[ctx.plan].credits;
  let left = ledger.length ? ledger.reduce((s, r) => s + r.delta, 0) : total;
  if (ctx.demo.state === "credits") left = 0;
  return { left: Math.max(0, Math.min(left, total)), total, trial };
}

/** Schrijft het verbruik van credits weg. Geeft false als er te weinig zijn (de server beslist, niet de knop). */
export async function spendCredits(ctx: AppContext, cost: number, reason: string): Promise<boolean> {
  const c = await creditsFor(ctx);
  if (!c || c.left < cost) return false;
  // Het grootboek schrijft alleen de server (RLS laat klanten enkel lezen).
  await serviceDb().from("credits_ledger").insert({ organization_id: ctx.org.id, delta: -cost, reason });
  return true;
}
