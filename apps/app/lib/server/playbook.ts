import "server-only";
import { cache } from "react";
import { must } from "@adsweet/db";
import { PLAYBOOK } from "@adsweet/playbook";
import { serviceDb } from "./auth";

// Het playbook dat nu geldt: de laatste gepubliceerde versie uit Beheer, aangevuld met de standaard uit
// @adsweet/playbook voor wat er niet in staat. Publiceren in Beheer verandert zo de regels in de app.

export interface PlaybookRules {
  version: string | null;
  publishedAt: string | null;
  minDailyBudget: { default: number; webshop: number };
  loserMultiple: number;
  startStructure: { campaigns: number; adSets: number; ads: number; photos: number; videos: number };
  scaleStep: number;
  newAdSetEveryWeeks: number;
  funnelSplit: { top: number; middle: number; bottom: number };
  statusWarnRatio: number;
}

export const currentPlaybook = cache(async (): Promise<PlaybookRules> => {
  const v = must(
    await serviceDb().from("playbook_versions").select().eq("status", "gepubliceerd").order("published_at", { ascending: false }).limit(1).maybeSingle(),
  );
  const r = (v?.rules ?? {}) as Partial<PlaybookRules>;
  return {
    version: v?.version ?? null,
    publishedAt: v?.published_at ?? null,
    minDailyBudget: { ...PLAYBOOK.minDailyBudget, ...r.minDailyBudget },
    loserMultiple: r.loserMultiple ?? PLAYBOOK.loserMultiple,
    startStructure: { ...PLAYBOOK.startStructure, ...r.startStructure },
    scaleStep: r.scaleStep ?? PLAYBOOK.scaleStep,
    newAdSetEveryWeeks: r.newAdSetEveryWeeks ?? PLAYBOOK.newAdSetEveryWeeks,
    funnelSplit: { ...PLAYBOOK.funnelSplit, ...r.funnelSplit },
    statusWarnRatio: r.statusWarnRatio ?? PLAYBOOK.statusWarnRatio,
  };
});

/** Minimum per dag: €30 voor een webshop die verkoopt, anders €10 (of wat de gepubliceerde versie zegt). */
export async function minDailyBudget(webshopSales: boolean): Promise<number> {
  const p = await currentPlaybook();
  return webshopSales ? p.minDailyBudget.webshop : p.minDailyBudget.default;
}
